var global = Function("return this;")();
/*!
  * Ender: open module JavaScript framework (client-lib)
  * copyright Dustin Diaz & Jacob Thornton 2011 (@ded @fat)
  * http://ender.no.de
  * License MIT
  */
!function (context) {

  // a global object for node.js module compatiblity
  // ============================================

  context['global'] = context

  // Implements simple module system
  // losely based on CommonJS Modules spec v1.1.1
  // ============================================

  var modules = {}
    , old = context.$

  function require (identifier) {
    // modules can be required from ender's build system, or found on the window
    var module = modules[identifier] || window[identifier]
    if (!module) throw new Error("Requested module '" + identifier + "' has not been defined.")
    return module
  }

  function provide (name, what) {
    return (modules[name] = what)
  }

  context['provide'] = provide
  context['require'] = require

  function aug(o, o2) {
    for (var k in o2) k != 'noConflict' && k != '_VERSION' && (o[k] = o2[k])
    return o
  }

  function boosh(s, r, els) {
    // string || node || nodelist || window
    if (typeof s == 'string' || s.nodeName || (s.length && 'item' in s) || s == window) {
      els = ender._select(s, r)
      els.selector = s
    } else els = isFinite(s.length) ? s : [s]
    return aug(els, boosh)
  }

  function ender(s, r) {
    return boosh(s, r)
  }

  aug(ender, {
      _VERSION: '0.3.6'
    , fn: boosh // for easy compat to jQuery plugins
    , ender: function (o, chain) {
        aug(chain ? boosh : ender, o)
      }
    , _select: function (s, r) {
        return (r || document).querySelectorAll(s)
      }
  })

  aug(boosh, {
    forEach: function (fn, scope, i) {
      // opt out of native forEach so we can intentionally call our own scope
      // defaulting to the current item and be able to return self
      for (i = 0, l = this.length; i < l; ++i) i in this && fn.call(scope || this[i], this[i], i, this)
      // return self for chaining
      return this
    },
    $: ender // handy reference to self
  })

  ender.noConflict = function () {
    context.$ = old
    return this
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = ender
  // use subscript notation as extern for Closure compilation
  context['ender'] = context['$'] = context['ender'] || ender

}(this);
// pakmanager:commander
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
    /**
     * Module dependencies.
     */
    
    var EventEmitter = require('events').EventEmitter;
    var spawn = require('child_process').spawn;
    var path = require('path');
    var dirname = path.dirname;
    var basename = path.basename;
    
    /**
     * Expose the root command.
     */
    
    exports = module.exports = new Command();
    
    /**
     * Expose `Command`.
     */
    
    exports.Command = Command;
    
    /**
     * Expose `Option`.
     */
    
    exports.Option = Option;
    
    /**
     * Initialize a new `Option` with the given `flags` and `description`.
     *
     * @param {String} flags
     * @param {String} description
     * @api public
     */
    
    function Option(flags, description) {
      this.flags = flags;
      this.required = ~flags.indexOf('<');
      this.optional = ~flags.indexOf('[');
      this.bool = !~flags.indexOf('-no-');
      flags = flags.split(/[ ,|]+/);
      if (flags.length > 1 && !/^[[<]/.test(flags[1])) this.short = flags.shift();
      this.long = flags.shift();
      this.description = description || '';
    }
    
    /**
     * Return option name.
     *
     * @return {String}
     * @api private
     */
    
    Option.prototype.name = function() {
      return this.long
        .replace('--', '')
        .replace('no-', '');
    };
    
    /**
     * Check if `arg` matches the short or long flag.
     *
     * @param {String} arg
     * @return {Boolean}
     * @api private
     */
    
    Option.prototype.is = function(arg) {
      return arg == this.short || arg == this.long;
    };
    
    /**
     * Initialize a new `Command`.
     *
     * @param {String} name
     * @api public
     */
    
    function Command(name) {
      this.commands = [];
      this.options = [];
      this._execs = [];
      this._args = [];
      this._name = name;
    }
    
    /**
     * Inherit from `EventEmitter.prototype`.
     */
    
    Command.prototype.__proto__ = EventEmitter.prototype;
    
    /**
     * Add command `name`.
     *
     * The `.action()` callback is invoked when the
     * command `name` is specified via __ARGV__,
     * and the remaining arguments are applied to the
     * function for access.
     *
     * When the `name` is "*" an un-matched command
     * will be passed as the first arg, followed by
     * the rest of __ARGV__ remaining.
     *
     * Examples:
     *
     *      program
     *        .version('0.0.1')
     *        .option('-C, --chdir <path>', 'change the working directory')
     *        .option('-c, --config <path>', 'set config path. defaults to ./deploy.conf')
     *        .option('-T, --no-tests', 'ignore test hook')
     *
     *      program
     *        .command('setup')
     *        .description('run remote setup commands')
     *        .action(function() {
     *          console.log('setup');
     *        });
     *
     *      program
     *        .command('exec <cmd>')
     *        .description('run the given remote command')
     *        .action(function(cmd) {
     *          console.log('exec "%s"', cmd);
     *        });
     *
     *      program
     *        .command('teardown <dir> [otherDirs...]')
     *        .description('run teardown commands')
     *        .action(function(dir, otherDirs) {
     *          console.log('dir "%s"', dir);
     *          if (otherDirs) {
     *            otherDirs.forEach(function (oDir) {
     *              console.log('dir "%s"', oDir);
     *            });
     *          }
     *        });
     *
     *      program
     *        .command('*')
     *        .description('deploy the given env')
     *        .action(function(env) {
     *          console.log('deploying "%s"', env);
     *        });
     *
     *      program.parse(process.argv);
      *
     * @param {String} name
     * @param {String} [desc]
     * @return {Command} the new command
     * @api public
     */
    
    Command.prototype.command = function(name, desc) {
      var args = name.split(/ +/);
      var cmd = new Command(args.shift());
      if (desc) cmd.description(desc);
      if (desc) this.executables = true;
      if (desc) this._execs[cmd._name] = true;
      this.commands.push(cmd);
      cmd.parseExpectedArgs(args);
      cmd.parent = this;
      if (desc) return this;
      return cmd;
    };
    
    /**
     * Add an implicit `help [cmd]` subcommand
     * which invokes `--help` for the given command.
     *
     * @api private
     */
    
    Command.prototype.addImplicitHelpCommand = function() {
      this.command('help [cmd]', 'display help for [cmd]');
    };
    
    /**
     * Parse expected `args`.
     *
     * For example `["[type]"]` becomes `[{ required: false, name: 'type' }]`.
     *
     * @param {Array} args
     * @return {Command} for chaining
     * @api public
     */
    
    Command.prototype.parseExpectedArgs = function(args) {
      if (!args.length) return;
      var self = this;
      args.forEach(function(arg) {
        var argDetails = {
          required: false,
          name: '',
          variadic: false
        };
    
        switch (arg[0]) {
          case '<':
            argDetails.required = true;
            argDetails.name = arg.slice(1, -1);
            break;
          case '[':
            argDetails.name = arg.slice(1, -1);
            break;
        }
    
        if (argDetails.name.indexOf('...') === argDetails.name.length - 3) {
          argDetails.variadic = true;
          argDetails.name = argDetails.name.slice(0, -3);
        }
    
        if (argDetails.name) {
          self._args.push(argDetails);
        }
      });
      return this;
    };
    
    /**
     * Register callback `fn` for the command.
     *
     * Examples:
     *
     *      program
     *        .command('help')
     *        .description('display verbose help')
     *        .action(function() {
     *           // output help here
     *        });
     *
     * @param {Function} fn
     * @return {Command} for chaining
     * @api public
     */
    
    Command.prototype.action = function(fn) {
      var self = this;
      var listener = function(args, unknown) {
        // Parse any so-far unknown options
        args = args || [];
        unknown = unknown || [];
    
        var parsed = self.parseOptions(unknown);
    
        // Output help if necessary
        outputHelpIfNecessary(self, parsed.unknown);
    
        // If there are still any unknown options, then we simply
        // die, unless someone asked for help, in which case we give it
        // to them, and then we die.
        if (parsed.unknown.length > 0) {
          self.unknownOption(parsed.unknown[0]);
        }
    
        // Leftover arguments need to be pushed back. Fixes issue #56
        if (parsed.args.length) args = parsed.args.concat(args);
    
        self._args.forEach(function(arg, i) {
          if (arg.required && null == args[i]) {
            self.missingArgument(arg.name);
          } else if (arg.variadic) {
            if (i !== self._args.length - 1) {
              self.variadicArgNotLast(arg.name);
            }
    
            args[i] = args.slice(i);
          }
        });
    
        // Always append ourselves to the end of the arguments,
        // to make sure we match the number of arguments the user
        // expects
        if (self._args.length) {
          args[self._args.length] = self;
        } else {
          args.push(self);
        }
    
        fn.apply(self, args);
      };
      this.parent.on(this._name, listener);
      if (this._alias) this.parent.on(this._alias, listener);
      return this;
    };
    
    /**
     * Define option with `flags`, `description` and optional
     * coercion `fn`.
     *
     * The `flags` string should contain both the short and long flags,
     * separated by comma, a pipe or space. The following are all valid
     * all will output this way when `--help` is used.
     *
     *    "-p, --pepper"
     *    "-p|--pepper"
     *    "-p --pepper"
     *
     * Examples:
     *
     *     // simple boolean defaulting to false
     *     program.option('-p, --pepper', 'add pepper');
     *
     *     --pepper
     *     program.pepper
     *     // => Boolean
     *
     *     // simple boolean defaulting to true
     *     program.option('-C, --no-cheese', 'remove cheese');
     *
     *     program.cheese
     *     // => true
     *
     *     --no-cheese
     *     program.cheese
     *     // => false
     *
     *     // required argument
     *     program.option('-C, --chdir <path>', 'change the working directory');
     *
     *     --chdir /tmp
     *     program.chdir
     *     // => "/tmp"
     *
     *     // optional argument
     *     program.option('-c, --cheese [type]', 'add cheese [marble]');
     *
     * @param {String} flags
     * @param {String} description
     * @param {Function|Mixed} fn or default
     * @param {Mixed} defaultValue
     * @return {Command} for chaining
     * @api public
     */
    
    Command.prototype.option = function(flags, description, fn, defaultValue) {
      var self = this
        , option = new Option(flags, description)
        , oname = option.name()
        , name = camelcase(oname);
    
      // default as 3rd arg
      if (typeof fn != 'function') {
        defaultValue = fn;
        fn = null;
      }
    
      // preassign default value only for --no-*, [optional], or <required>
      if (false == option.bool || option.optional || option.required) {
        // when --no-* we make sure default is true
        if (false == option.bool) defaultValue = true;
        // preassign only if we have a default
        if (undefined !== defaultValue) self[name] = defaultValue;
      }
    
      // register the option
      this.options.push(option);
    
      // when it's passed assign the value
      // and conditionally invoke the callback
      this.on(oname, function(val) {
        // coercion
        if (null !== val && fn) val = fn(val, undefined === self[name]
          ? defaultValue
          : self[name]);
    
        // unassigned or bool
        if ('boolean' == typeof self[name] || 'undefined' == typeof self[name]) {
          // if no value, bool true, and we have a default, then use it!
          if (null == val) {
            self[name] = option.bool
              ? defaultValue || true
              : false;
          } else {
            self[name] = val;
          }
        } else if (null !== val) {
          // reassign
          self[name] = val;
        }
      });
    
      return this;
    };
    
    /**
     * Parse `argv`, settings options and invoking commands when defined.
     *
     * @param {Array} argv
     * @return {Command} for chaining
     * @api public
     */
    
    Command.prototype.parse = function(argv) {
      // implicit help
      if (this.executables) this.addImplicitHelpCommand();
    
      // store raw args
      this.rawArgs = argv;
    
      // guess name
      this._name = this._name || basename(argv[1], '.js');
    
      // process argv
      var parsed = this.parseOptions(this.normalize(argv.slice(2)));
      var args = this.args = parsed.args;
    
      var result = this.parseArgs(this.args, parsed.unknown);
    
      // executable sub-commands
      var name = result.args[0];
      if (this._execs[name] && typeof this._execs[name] != "function") {
        return this.executeSubCommand(argv, args, parsed.unknown);
      }
    
      return result;
    };
    
    /**
     * Execute a sub-command executable.
     *
     * @param {Array} argv
     * @param {Array} args
     * @param {Array} unknown
     * @api private
     */
    
    Command.prototype.executeSubCommand = function(argv, args, unknown) {
      args = args.concat(unknown);
    
      if (!args.length) this.help();
      if ('help' == args[0] && 1 == args.length) this.help();
    
      // <cmd> --help
      if ('help' == args[0]) {
        args[0] = args[1];
        args[1] = '--help';
      }
    
      // executable
      var dir = dirname(argv[1]);
      var bin = basename(argv[1], '.js') + '-' + args[0];
    
      // check for ./<bin> first
      var local = path.join(dir, bin);
    
      // run it
      args = args.slice(1);
      args.unshift(local);
      var proc = spawn('node', args, { stdio: 'inherit', customFds: [0, 1, 2] });
      proc.on('error', function(err) {
        if (err.code == "ENOENT") {
          console.error('\n  %s(1) does not exist, try --help\n', bin);
        } else if (err.code == "EACCES") {
          console.error('\n  %s(1) not executable. try chmod or run with root\n', bin);
        }
      });
    
      this.runningCommand = proc;
    };
    
    /**
     * Normalize `args`, splitting joined short flags. For example
     * the arg "-abc" is equivalent to "-a -b -c".
     * This also normalizes equal sign and splits "--abc=def" into "--abc def".
     *
     * @param {Array} args
     * @return {Array}
     * @api private
     */
    
    Command.prototype.normalize = function(args) {
      var ret = []
        , arg
        , lastOpt
        , index;
    
      for (var i = 0, len = args.length; i < len; ++i) {
        arg = args[i];
        if (i > 0) {
          lastOpt = this.optionFor(args[i-1]);
        }
    
        if (arg === '--') {
          // Honor option terminator
          ret = ret.concat(args.slice(i));
          break;
        } else if (lastOpt && lastOpt.required) {
          ret.push(arg);
        } else if (arg.length > 1 && '-' == arg[0] && '-' != arg[1]) {
          arg.slice(1).split('').forEach(function(c) {
            ret.push('-' + c);
          });
        } else if (/^--/.test(arg) && ~(index = arg.indexOf('='))) {
          ret.push(arg.slice(0, index), arg.slice(index + 1));
        } else {
          ret.push(arg);
        }
      }
    
      return ret;
    };
    
    /**
     * Parse command `args`.
     *
     * When listener(s) are available those
     * callbacks are invoked, otherwise the "*"
     * event is emitted and those actions are invoked.
     *
     * @param {Array} args
     * @return {Command} for chaining
     * @api private
     */
    
    Command.prototype.parseArgs = function(args, unknown) {
      var name;
    
      if (args.length) {
        name = args[0];
        if (this.listeners(name).length) {
          this.emit(args.shift(), args, unknown);
        } else {
          this.emit('*', args);
        }
      } else {
        outputHelpIfNecessary(this, unknown);
    
        // If there were no args and we have unknown options,
        // then they are extraneous and we need to error.
        if (unknown.length > 0) {
          this.unknownOption(unknown[0]);
        }
      }
    
      return this;
    };
    
    /**
     * Return an option matching `arg` if any.
     *
     * @param {String} arg
     * @return {Option}
     * @api private
     */
    
    Command.prototype.optionFor = function(arg) {
      for (var i = 0, len = this.options.length; i < len; ++i) {
        if (this.options[i].is(arg)) {
          return this.options[i];
        }
      }
    };
    
    /**
     * Parse options from `argv` returning `argv`
     * void of these options.
     *
     * @param {Array} argv
     * @return {Array}
     * @api public
     */
    
    Command.prototype.parseOptions = function(argv) {
      var args = []
        , len = argv.length
        , literal
        , option
        , arg;
    
      var unknownOptions = [];
    
      // parse options
      for (var i = 0; i < len; ++i) {
        arg = argv[i];
    
        // literal args after --
        if ('--' == arg) {
          literal = true;
          continue;
        }
    
        if (literal) {
          args.push(arg);
          continue;
        }
    
        // find matching Option
        option = this.optionFor(arg);
    
        // option is defined
        if (option) {
          // requires arg
          if (option.required) {
            arg = argv[++i];
            if (null == arg) return this.optionMissingArgument(option);
            this.emit(option.name(), arg);
          // optional arg
          } else if (option.optional) {
            arg = argv[i+1];
            if (null == arg || ('-' == arg[0] && '-' != arg)) {
              arg = null;
            } else {
              ++i;
            }
            this.emit(option.name(), arg);
          // bool
          } else {
            this.emit(option.name());
          }
          continue;
        }
    
        // looks like an option
        if (arg.length > 1 && '-' == arg[0]) {
          unknownOptions.push(arg);
    
          // If the next argument looks like it might be
          // an argument for this option, we pass it on.
          // If it isn't, then it'll simply be ignored
          if (argv[i+1] && '-' != argv[i+1][0]) {
            unknownOptions.push(argv[++i]);
          }
          continue;
        }
    
        // arg
        args.push(arg);
      }
    
      return { args: args, unknown: unknownOptions };
    };
    
    /**
     * Return an object containing options as key-value pairs
     *
     * @return {Object}
     * @api public
     */
    Command.prototype.opts = function() {
      var result = {}
        , len = this.options.length;
    
      for (var i = 0 ; i < len; i++) {
        var key = this.options[i].name();
        result[key] = key === 'version' ? this._version : this[key];
      }
      return result;
    };
    
    /**
     * Argument `name` is missing.
     *
     * @param {String} name
     * @api private
     */
    
    Command.prototype.missingArgument = function(name) {
      console.error();
      console.error("  error: missing required argument `%s'", name);
      console.error();
      process.exit(1);
    };
    
    /**
     * `Option` is missing an argument, but received `flag` or nothing.
     *
     * @param {String} option
     * @param {String} flag
     * @api private
     */
    
    Command.prototype.optionMissingArgument = function(option, flag) {
      console.error();
      if (flag) {
        console.error("  error: option `%s' argument missing, got `%s'", option.flags, flag);
      } else {
        console.error("  error: option `%s' argument missing", option.flags);
      }
      console.error();
      process.exit(1);
    };
    
    /**
     * Unknown option `flag`.
     *
     * @param {String} flag
     * @api private
     */
    
    Command.prototype.unknownOption = function(flag) {
      console.error();
      console.error("  error: unknown option `%s'", flag);
      console.error();
      process.exit(1);
    };
    
    /**
     * Variadic argument with `name` is not the last argument as required.
     *
     * @param {String} name
     * @api private
     */
    
    Command.prototype.variadicArgNotLast = function(name) {
      console.error();
      console.error("  error: variadic arguments must be last `%s'", name);
      console.error();
      process.exit(1);
    };
    
    /**
     * Set the program version to `str`.
     *
     * This method auto-registers the "-V, --version" flag
     * which will print the version number when passed.
     *
     * @param {String} str
     * @param {String} flags
     * @return {Command} for chaining
     * @api public
     */
    
    Command.prototype.version = function(str, flags) {
      if (0 == arguments.length) return this._version;
      this._version = str;
      flags = flags || '-V, --version';
      this.option(flags, 'output the version number');
      this.on('version', function() {
        process.stdout.write(str + '\n');
        process.exit(0);
      });
      return this;
    };
    
    /**
     * Set the description to `str`.
     *
     * @param {String} str
     * @return {String|Command}
     * @api public
     */
    
    Command.prototype.description = function(str) {
      if (0 == arguments.length) return this._description;
      this._description = str;
      return this;
    };
    
    /**
     * Set an alias for the command
     *
     * @param {String} alias
     * @return {String|Command}
     * @api public
     */
    
    Command.prototype.alias = function(alias) {
      if (0 == arguments.length) return this._alias;
      this._alias = alias;
      return this;
    };
    
    /**
     * Set / get the command usage `str`.
     *
     * @param {String} str
     * @return {String|Command}
     * @api public
     */
    
    Command.prototype.usage = function(str) {
      var args = this._args.map(function(arg) {
        return humanReadableArgName(arg);
      });
    
      var usage = '[options]'
        + (this.commands.length ? ' [command]' : '')
        + (this._args.length ? ' ' + args.join(' ') : '');
    
      if (0 == arguments.length) return this._usage || usage;
      this._usage = str;
    
      return this;
    };
    
    /**
     * Get the name of the command
     *
     * @param {String} name
     * @return {String|Command}
     * @api public
     */
    
    Command.prototype.name = function(name) {
      return this._name;
    };
    
    /**
     * Return the largest option length.
     *
     * @return {Number}
     * @api private
     */
    
    Command.prototype.largestOptionLength = function() {
      return this.options.reduce(function(max, option) {
        return Math.max(max, option.flags.length);
      }, 0);
    };
    
    /**
     * Return help for options.
     *
     * @return {String}
     * @api private
     */
    
    Command.prototype.optionHelp = function() {
      var width = this.largestOptionLength();
    
      // Prepend the help information
      return [pad('-h, --help', width) + '  ' + 'output usage information']
        .concat(this.options.map(function(option) {
          return pad(option.flags, width) + '  ' + option.description;
          }))
        .join('\n');
    };
    
    /**
     * Return command help documentation.
     *
     * @return {String}
     * @api private
     */
    
    Command.prototype.commandHelp = function() {
      if (!this.commands.length) return '';
    
      var commands = this.commands.map(function(cmd) {
        var args = cmd._args.map(function(arg) {
          return humanReadableArgName(arg);
        }).join(' ');
    
        return [
          cmd._name
            + (cmd._alias
              ? '|' + cmd._alias
              : '')
            + (cmd.options.length
              ? ' [options]'
              : '')
            + ' ' + args
        , cmd.description()
        ];
      });
    
      var width = commands.reduce(function(max, command) {
        return Math.max(max, command[0].length);
      }, 0);
    
      return [
          ''
        , '  Commands:'
        , ''
        , commands.map(function(cmd) {
          return pad(cmd[0], width) + '  ' + cmd[1];
        }).join('\n').replace(/^/gm, '    ')
        , ''
      ].join('\n');
    };
    
    /**
     * Return program help documentation.
     *
     * @return {String}
     * @api private
     */
    
    Command.prototype.helpInformation = function() {
      return [
          ''
        , '  Usage: ' + this._name
            + (this._alias
              ? '|' + this._alias
              : '')
            + ' ' + this.usage()
        , '' + this.commandHelp()
        , '  Options:'
        , ''
        , '' + this.optionHelp().replace(/^/gm, '    ')
        , ''
        , ''
      ].join('\n');
    };
    
    /**
     * Output help information for this command
     *
     * @api public
     */
    
    Command.prototype.outputHelp = function() {
      process.stdout.write(this.helpInformation());
      this.emit('--help');
    };
    
    /**
     * Output help information and exit.
     *
     * @api public
     */
    
    Command.prototype.help = function() {
      this.outputHelp();
      process.exit();
    };
    
    /**
     * Camel-case the given `flag`
     *
     * @param {String} flag
     * @return {String}
     * @api private
     */
    
    function camelcase(flag) {
      return flag.split('-').reduce(function(str, word) {
        return str + word[0].toUpperCase() + word.slice(1);
      });
    }
    
    /**
     * Pad `str` to `width`.
     *
     * @param {String} str
     * @param {Number} width
     * @return {String}
     * @api private
     */
    
    function pad(str, width) {
      var len = Math.max(0, width - str.length);
      return str + Array(len + 1).join(' ');
    }
    
    /**
     * Output help information if necessary
     *
     * @param {Command} command to output help for
     * @param {Array} array of options to search for -h or --help
     * @api private
     */
    
    function outputHelpIfNecessary(cmd, options) {
      options = options || [];
      for (var i = 0; i < options.length; i++) {
        if (options[i] == '--help' || options[i] == '-h') {
          cmd.outputHelp();
          process.exit(0);
        }
      }
    }
    
    /**
     * Takes an argument an returns its human readable equivalent for help usage.
     *
     * @param {Object} arg
     * @return {String}
     * @api private
     */
    
    function humanReadableArgName(arg) {
      var nameOutput = arg.name + (arg.variadic === true ? '...' : '');
    
      return arg.required
        ? '<' + nameOutput + '>'
        : '[' + nameOutput + ']'
    }
    
  provide("commander", module.exports);
}(global));

// pakmanager:nan
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  console.log(require('path').relative('.', __dirname));
    
  provide("nan", module.exports);
}(global));

// pakmanager:tinycolor
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  var styles = {
      'bold':      ['\033[1m', '\033[22m'],
      'italic':    ['\033[3m', '\033[23m'],
      'underline': ['\033[4m', '\033[24m'],
      'inverse':   ['\033[7m', '\033[27m'],
      'black':     ['\033[30m', '\033[39m'],
      'red':       ['\033[31m', '\033[39m'],
      'green':     ['\033[32m', '\033[39m'],
      'yellow':    ['\033[33m', '\033[39m'],
      'blue':      ['\033[34m', '\033[39m'],
      'magenta':   ['\033[35m', '\033[39m'],
      'cyan':      ['\033[36m', '\033[39m'],
      'white':     ['\033[37m', '\033[39m'],
      'default':   ['\033[39m', '\033[39m'],
      'grey':      ['\033[90m', '\033[39m'],
      'bgBlack':   ['\033[40m', '\033[49m'],
      'bgRed':     ['\033[41m', '\033[49m'],
      'bgGreen':   ['\033[42m', '\033[49m'],
      'bgYellow':  ['\033[43m', '\033[49m'],
      'bgBlue':    ['\033[44m', '\033[49m'],
      'bgMagenta': ['\033[45m', '\033[49m'],
      'bgCyan':    ['\033[46m', '\033[49m'],
      'bgWhite':   ['\033[47m', '\033[49m'],
      'bgDefault': ['\033[49m', '\033[49m']
    }
    Object.keys(styles).forEach(function(style) {
      Object.defineProperty(String.prototype, style, {
        get: function() { return styles[style][0] + this + styles[style][1]; },
        enumerable: false
      });
    });
    
  provide("tinycolor", module.exports);
}(global));

// pakmanager:options
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*!
     * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
     * MIT Licensed
     */
    
    var fs = require('fs');
    
    function Options(defaults) {
      var internalValues = {};
      var values = this.value = {};
      Object.keys(defaults).forEach(function(key) {
        internalValues[key] = defaults[key];
        Object.defineProperty(values, key, {
          get: function() { return internalValues[key]; },
          configurable: false,
          enumerable: true
        });
      });
      this.reset = function() {
        Object.keys(defaults).forEach(function(key) {
          internalValues[key] = defaults[key];
        });
        return this;
      };
      this.merge = function(options, required) {
        options = options || {};
        if (Object.prototype.toString.call(required) === '[object Array]') {
          var missing = [];
          for (var i = 0, l = required.length; i < l; ++i) {
            var key = required[i];
            if (!(key in options)) {
              missing.push(key);
            }
          }
          if (missing.length > 0) {
            if (missing.length > 1) {
              throw new Error('options ' +
                missing.slice(0, missing.length - 1).join(', ') + ' and ' +
                missing[missing.length - 1] + ' must be defined');
            }
            else throw new Error('option ' + missing[0] + ' must be defined');
          }
        }
        Object.keys(options).forEach(function(key) {
          if (key in internalValues) {
            internalValues[key] = options[key];
          }
        });
        return this;
      };
      this.copy = function(keys) {
        var obj = {};
        Object.keys(defaults).forEach(function(key) {
          if (keys.indexOf(key) !== -1) {
            obj[key] = values[key];
          }
        });
        return obj;
      };
      this.read = function(filename, cb) {
        if (typeof cb == 'function') {
          var self = this;
          fs.readFile(filename, function(error, data) {
            if (error) return cb(error);
            var conf = JSON.parse(data);
            self.merge(conf);
            cb();
          });
        }
        else {
          var conf = JSON.parse(fs.readFileSync(filename));
          this.merge(conf);
        }
        return this;
      };
      this.isDefined = function(key) {
        return typeof values[key] != 'undefined';
      };
      this.isDefinedAndNonNull = function(key) {
        return typeof values[key] != 'undefined' && values[key] !== null;
      };
      Object.freeze(values);
      Object.freeze(this);
    }
    
    module.exports = Options;
    
  provide("options", module.exports);
}(global));

// pakmanager:underscore
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  //     Underscore.js 1.7.0
    //     http://underscorejs.org
    //     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
    //     Underscore may be freely distributed under the MIT license.
    
    (function() {
    
      // Baseline setup
      // --------------
    
      // Establish the root object, `window` in the browser, or `exports` on the server.
      var root = this;
    
      // Save the previous value of the `_` variable.
      var previousUnderscore = root._;
    
      // Save bytes in the minified (but not gzipped) version:
      var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;
    
      // Create quick reference variables for speed access to core prototypes.
      var
        push             = ArrayProto.push,
        slice            = ArrayProto.slice,
        concat           = ArrayProto.concat,
        toString         = ObjProto.toString,
        hasOwnProperty   = ObjProto.hasOwnProperty;
    
      // All **ECMAScript 5** native function implementations that we hope to use
      // are declared here.
      var
        nativeIsArray      = Array.isArray,
        nativeKeys         = Object.keys,
        nativeBind         = FuncProto.bind;
    
      // Create a safe reference to the Underscore object for use below.
      var _ = function(obj) {
        if (obj instanceof _) return obj;
        if (!(this instanceof _)) return new _(obj);
        this._wrapped = obj;
      };
    
      // Export the Underscore object for **Node.js**, with
      // backwards-compatibility for the old `require()` API. If we're in
      // the browser, add `_` as a global object.
      if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
          exports = module.exports = _;
        }
        exports._ = _;
      } else {
        root._ = _;
      }
    
      // Current version.
      _.VERSION = '1.7.0';
    
      // Internal function that returns an efficient (for current engines) version
      // of the passed-in callback, to be repeatedly applied in other Underscore
      // functions.
      var createCallback = function(func, context, argCount) {
        if (context === void 0) return func;
        switch (argCount == null ? 3 : argCount) {
          case 1: return function(value) {
            return func.call(context, value);
          };
          case 2: return function(value, other) {
            return func.call(context, value, other);
          };
          case 3: return function(value, index, collection) {
            return func.call(context, value, index, collection);
          };
          case 4: return function(accumulator, value, index, collection) {
            return func.call(context, accumulator, value, index, collection);
          };
        }
        return function() {
          return func.apply(context, arguments);
        };
      };
    
      // A mostly-internal function to generate callbacks that can be applied
      // to each element in a collection, returning the desired result — either
      // identity, an arbitrary callback, a property matcher, or a property accessor.
      _.iteratee = function(value, context, argCount) {
        if (value == null) return _.identity;
        if (_.isFunction(value)) return createCallback(value, context, argCount);
        if (_.isObject(value)) return _.matches(value);
        return _.property(value);
      };
    
      // Collection Functions
      // --------------------
    
      // The cornerstone, an `each` implementation, aka `forEach`.
      // Handles raw objects in addition to array-likes. Treats all
      // sparse array-likes as if they were dense.
      _.each = _.forEach = function(obj, iteratee, context) {
        if (obj == null) return obj;
        iteratee = createCallback(iteratee, context);
        var i, length = obj.length;
        if (length === +length) {
          for (i = 0; i < length; i++) {
            iteratee(obj[i], i, obj);
          }
        } else {
          var keys = _.keys(obj);
          for (i = 0, length = keys.length; i < length; i++) {
            iteratee(obj[keys[i]], keys[i], obj);
          }
        }
        return obj;
      };
    
      // Return the results of applying the iteratee to each element.
      _.map = _.collect = function(obj, iteratee, context) {
        if (obj == null) return [];
        iteratee = _.iteratee(iteratee, context);
        var keys = obj.length !== +obj.length && _.keys(obj),
            length = (keys || obj).length,
            results = Array(length),
            currentKey;
        for (var index = 0; index < length; index++) {
          currentKey = keys ? keys[index] : index;
          results[index] = iteratee(obj[currentKey], currentKey, obj);
        }
        return results;
      };
    
      var reduceError = 'Reduce of empty array with no initial value';
    
      // **Reduce** builds up a single result from a list of values, aka `inject`,
      // or `foldl`.
      _.reduce = _.foldl = _.inject = function(obj, iteratee, memo, context) {
        if (obj == null) obj = [];
        iteratee = createCallback(iteratee, context, 4);
        var keys = obj.length !== +obj.length && _.keys(obj),
            length = (keys || obj).length,
            index = 0, currentKey;
        if (arguments.length < 3) {
          if (!length) throw new TypeError(reduceError);
          memo = obj[keys ? keys[index++] : index++];
        }
        for (; index < length; index++) {
          currentKey = keys ? keys[index] : index;
          memo = iteratee(memo, obj[currentKey], currentKey, obj);
        }
        return memo;
      };
    
      // The right-associative version of reduce, also known as `foldr`.
      _.reduceRight = _.foldr = function(obj, iteratee, memo, context) {
        if (obj == null) obj = [];
        iteratee = createCallback(iteratee, context, 4);
        var keys = obj.length !== + obj.length && _.keys(obj),
            index = (keys || obj).length,
            currentKey;
        if (arguments.length < 3) {
          if (!index) throw new TypeError(reduceError);
          memo = obj[keys ? keys[--index] : --index];
        }
        while (index--) {
          currentKey = keys ? keys[index] : index;
          memo = iteratee(memo, obj[currentKey], currentKey, obj);
        }
        return memo;
      };
    
      // Return the first value which passes a truth test. Aliased as `detect`.
      _.find = _.detect = function(obj, predicate, context) {
        var result;
        predicate = _.iteratee(predicate, context);
        _.some(obj, function(value, index, list) {
          if (predicate(value, index, list)) {
            result = value;
            return true;
          }
        });
        return result;
      };
    
      // Return all the elements that pass a truth test.
      // Aliased as `select`.
      _.filter = _.select = function(obj, predicate, context) {
        var results = [];
        if (obj == null) return results;
        predicate = _.iteratee(predicate, context);
        _.each(obj, function(value, index, list) {
          if (predicate(value, index, list)) results.push(value);
        });
        return results;
      };
    
      // Return all the elements for which a truth test fails.
      _.reject = function(obj, predicate, context) {
        return _.filter(obj, _.negate(_.iteratee(predicate)), context);
      };
    
      // Determine whether all of the elements match a truth test.
      // Aliased as `all`.
      _.every = _.all = function(obj, predicate, context) {
        if (obj == null) return true;
        predicate = _.iteratee(predicate, context);
        var keys = obj.length !== +obj.length && _.keys(obj),
            length = (keys || obj).length,
            index, currentKey;
        for (index = 0; index < length; index++) {
          currentKey = keys ? keys[index] : index;
          if (!predicate(obj[currentKey], currentKey, obj)) return false;
        }
        return true;
      };
    
      // Determine if at least one element in the object matches a truth test.
      // Aliased as `any`.
      _.some = _.any = function(obj, predicate, context) {
        if (obj == null) return false;
        predicate = _.iteratee(predicate, context);
        var keys = obj.length !== +obj.length && _.keys(obj),
            length = (keys || obj).length,
            index, currentKey;
        for (index = 0; index < length; index++) {
          currentKey = keys ? keys[index] : index;
          if (predicate(obj[currentKey], currentKey, obj)) return true;
        }
        return false;
      };
    
      // Determine if the array or object contains a given value (using `===`).
      // Aliased as `include`.
      _.contains = _.include = function(obj, target) {
        if (obj == null) return false;
        if (obj.length !== +obj.length) obj = _.values(obj);
        return _.indexOf(obj, target) >= 0;
      };
    
      // Invoke a method (with arguments) on every item in a collection.
      _.invoke = function(obj, method) {
        var args = slice.call(arguments, 2);
        var isFunc = _.isFunction(method);
        return _.map(obj, function(value) {
          return (isFunc ? method : value[method]).apply(value, args);
        });
      };
    
      // Convenience version of a common use case of `map`: fetching a property.
      _.pluck = function(obj, key) {
        return _.map(obj, _.property(key));
      };
    
      // Convenience version of a common use case of `filter`: selecting only objects
      // containing specific `key:value` pairs.
      _.where = function(obj, attrs) {
        return _.filter(obj, _.matches(attrs));
      };
    
      // Convenience version of a common use case of `find`: getting the first object
      // containing specific `key:value` pairs.
      _.findWhere = function(obj, attrs) {
        return _.find(obj, _.matches(attrs));
      };
    
      // Return the maximum element (or element-based computation).
      _.max = function(obj, iteratee, context) {
        var result = -Infinity, lastComputed = -Infinity,
            value, computed;
        if (iteratee == null && obj != null) {
          obj = obj.length === +obj.length ? obj : _.values(obj);
          for (var i = 0, length = obj.length; i < length; i++) {
            value = obj[i];
            if (value > result) {
              result = value;
            }
          }
        } else {
          iteratee = _.iteratee(iteratee, context);
          _.each(obj, function(value, index, list) {
            computed = iteratee(value, index, list);
            if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
              result = value;
              lastComputed = computed;
            }
          });
        }
        return result;
      };
    
      // Return the minimum element (or element-based computation).
      _.min = function(obj, iteratee, context) {
        var result = Infinity, lastComputed = Infinity,
            value, computed;
        if (iteratee == null && obj != null) {
          obj = obj.length === +obj.length ? obj : _.values(obj);
          for (var i = 0, length = obj.length; i < length; i++) {
            value = obj[i];
            if (value < result) {
              result = value;
            }
          }
        } else {
          iteratee = _.iteratee(iteratee, context);
          _.each(obj, function(value, index, list) {
            computed = iteratee(value, index, list);
            if (computed < lastComputed || computed === Infinity && result === Infinity) {
              result = value;
              lastComputed = computed;
            }
          });
        }
        return result;
      };
    
      // Shuffle a collection, using the modern version of the
      // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
      _.shuffle = function(obj) {
        var set = obj && obj.length === +obj.length ? obj : _.values(obj);
        var length = set.length;
        var shuffled = Array(length);
        for (var index = 0, rand; index < length; index++) {
          rand = _.random(0, index);
          if (rand !== index) shuffled[index] = shuffled[rand];
          shuffled[rand] = set[index];
        }
        return shuffled;
      };
    
      // Sample **n** random values from a collection.
      // If **n** is not specified, returns a single random element.
      // The internal `guard` argument allows it to work with `map`.
      _.sample = function(obj, n, guard) {
        if (n == null || guard) {
          if (obj.length !== +obj.length) obj = _.values(obj);
          return obj[_.random(obj.length - 1)];
        }
        return _.shuffle(obj).slice(0, Math.max(0, n));
      };
    
      // Sort the object's values by a criterion produced by an iteratee.
      _.sortBy = function(obj, iteratee, context) {
        iteratee = _.iteratee(iteratee, context);
        return _.pluck(_.map(obj, function(value, index, list) {
          return {
            value: value,
            index: index,
            criteria: iteratee(value, index, list)
          };
        }).sort(function(left, right) {
          var a = left.criteria;
          var b = right.criteria;
          if (a !== b) {
            if (a > b || a === void 0) return 1;
            if (a < b || b === void 0) return -1;
          }
          return left.index - right.index;
        }), 'value');
      };
    
      // An internal function used for aggregate "group by" operations.
      var group = function(behavior) {
        return function(obj, iteratee, context) {
          var result = {};
          iteratee = _.iteratee(iteratee, context);
          _.each(obj, function(value, index) {
            var key = iteratee(value, index, obj);
            behavior(result, value, key);
          });
          return result;
        };
      };
    
      // Groups the object's values by a criterion. Pass either a string attribute
      // to group by, or a function that returns the criterion.
      _.groupBy = group(function(result, value, key) {
        if (_.has(result, key)) result[key].push(value); else result[key] = [value];
      });
    
      // Indexes the object's values by a criterion, similar to `groupBy`, but for
      // when you know that your index values will be unique.
      _.indexBy = group(function(result, value, key) {
        result[key] = value;
      });
    
      // Counts instances of an object that group by a certain criterion. Pass
      // either a string attribute to count by, or a function that returns the
      // criterion.
      _.countBy = group(function(result, value, key) {
        if (_.has(result, key)) result[key]++; else result[key] = 1;
      });
    
      // Use a comparator function to figure out the smallest index at which
      // an object should be inserted so as to maintain order. Uses binary search.
      _.sortedIndex = function(array, obj, iteratee, context) {
        iteratee = _.iteratee(iteratee, context, 1);
        var value = iteratee(obj);
        var low = 0, high = array.length;
        while (low < high) {
          var mid = low + high >>> 1;
          if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
        }
        return low;
      };
    
      // Safely create a real, live array from anything iterable.
      _.toArray = function(obj) {
        if (!obj) return [];
        if (_.isArray(obj)) return slice.call(obj);
        if (obj.length === +obj.length) return _.map(obj, _.identity);
        return _.values(obj);
      };
    
      // Return the number of elements in an object.
      _.size = function(obj) {
        if (obj == null) return 0;
        return obj.length === +obj.length ? obj.length : _.keys(obj).length;
      };
    
      // Split a collection into two arrays: one whose elements all satisfy the given
      // predicate, and one whose elements all do not satisfy the predicate.
      _.partition = function(obj, predicate, context) {
        predicate = _.iteratee(predicate, context);
        var pass = [], fail = [];
        _.each(obj, function(value, key, obj) {
          (predicate(value, key, obj) ? pass : fail).push(value);
        });
        return [pass, fail];
      };
    
      // Array Functions
      // ---------------
    
      // Get the first element of an array. Passing **n** will return the first N
      // values in the array. Aliased as `head` and `take`. The **guard** check
      // allows it to work with `_.map`.
      _.first = _.head = _.take = function(array, n, guard) {
        if (array == null) return void 0;
        if (n == null || guard) return array[0];
        if (n < 0) return [];
        return slice.call(array, 0, n);
      };
    
      // Returns everything but the last entry of the array. Especially useful on
      // the arguments object. Passing **n** will return all the values in
      // the array, excluding the last N. The **guard** check allows it to work with
      // `_.map`.
      _.initial = function(array, n, guard) {
        return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
      };
    
      // Get the last element of an array. Passing **n** will return the last N
      // values in the array. The **guard** check allows it to work with `_.map`.
      _.last = function(array, n, guard) {
        if (array == null) return void 0;
        if (n == null || guard) return array[array.length - 1];
        return slice.call(array, Math.max(array.length - n, 0));
      };
    
      // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
      // Especially useful on the arguments object. Passing an **n** will return
      // the rest N values in the array. The **guard**
      // check allows it to work with `_.map`.
      _.rest = _.tail = _.drop = function(array, n, guard) {
        return slice.call(array, n == null || guard ? 1 : n);
      };
    
      // Trim out all falsy values from an array.
      _.compact = function(array) {
        return _.filter(array, _.identity);
      };
    
      // Internal implementation of a recursive `flatten` function.
      var flatten = function(input, shallow, strict, output) {
        if (shallow && _.every(input, _.isArray)) {
          return concat.apply(output, input);
        }
        for (var i = 0, length = input.length; i < length; i++) {
          var value = input[i];
          if (!_.isArray(value) && !_.isArguments(value)) {
            if (!strict) output.push(value);
          } else if (shallow) {
            push.apply(output, value);
          } else {
            flatten(value, shallow, strict, output);
          }
        }
        return output;
      };
    
      // Flatten out an array, either recursively (by default), or just one level.
      _.flatten = function(array, shallow) {
        return flatten(array, shallow, false, []);
      };
    
      // Return a version of the array that does not contain the specified value(s).
      _.without = function(array) {
        return _.difference(array, slice.call(arguments, 1));
      };
    
      // Produce a duplicate-free version of the array. If the array has already
      // been sorted, you have the option of using a faster algorithm.
      // Aliased as `unique`.
      _.uniq = _.unique = function(array, isSorted, iteratee, context) {
        if (array == null) return [];
        if (!_.isBoolean(isSorted)) {
          context = iteratee;
          iteratee = isSorted;
          isSorted = false;
        }
        if (iteratee != null) iteratee = _.iteratee(iteratee, context);
        var result = [];
        var seen = [];
        for (var i = 0, length = array.length; i < length; i++) {
          var value = array[i];
          if (isSorted) {
            if (!i || seen !== value) result.push(value);
            seen = value;
          } else if (iteratee) {
            var computed = iteratee(value, i, array);
            if (_.indexOf(seen, computed) < 0) {
              seen.push(computed);
              result.push(value);
            }
          } else if (_.indexOf(result, value) < 0) {
            result.push(value);
          }
        }
        return result;
      };
    
      // Produce an array that contains the union: each distinct element from all of
      // the passed-in arrays.
      _.union = function() {
        return _.uniq(flatten(arguments, true, true, []));
      };
    
      // Produce an array that contains every item shared between all the
      // passed-in arrays.
      _.intersection = function(array) {
        if (array == null) return [];
        var result = [];
        var argsLength = arguments.length;
        for (var i = 0, length = array.length; i < length; i++) {
          var item = array[i];
          if (_.contains(result, item)) continue;
          for (var j = 1; j < argsLength; j++) {
            if (!_.contains(arguments[j], item)) break;
          }
          if (j === argsLength) result.push(item);
        }
        return result;
      };
    
      // Take the difference between one array and a number of other arrays.
      // Only the elements present in just the first array will remain.
      _.difference = function(array) {
        var rest = flatten(slice.call(arguments, 1), true, true, []);
        return _.filter(array, function(value){
          return !_.contains(rest, value);
        });
      };
    
      // Zip together multiple lists into a single array -- elements that share
      // an index go together.
      _.zip = function(array) {
        if (array == null) return [];
        var length = _.max(arguments, 'length').length;
        var results = Array(length);
        for (var i = 0; i < length; i++) {
          results[i] = _.pluck(arguments, i);
        }
        return results;
      };
    
      // Converts lists into objects. Pass either a single array of `[key, value]`
      // pairs, or two parallel arrays of the same length -- one of keys, and one of
      // the corresponding values.
      _.object = function(list, values) {
        if (list == null) return {};
        var result = {};
        for (var i = 0, length = list.length; i < length; i++) {
          if (values) {
            result[list[i]] = values[i];
          } else {
            result[list[i][0]] = list[i][1];
          }
        }
        return result;
      };
    
      // Return the position of the first occurrence of an item in an array,
      // or -1 if the item is not included in the array.
      // If the array is large and already in sort order, pass `true`
      // for **isSorted** to use binary search.
      _.indexOf = function(array, item, isSorted) {
        if (array == null) return -1;
        var i = 0, length = array.length;
        if (isSorted) {
          if (typeof isSorted == 'number') {
            i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
          } else {
            i = _.sortedIndex(array, item);
            return array[i] === item ? i : -1;
          }
        }
        for (; i < length; i++) if (array[i] === item) return i;
        return -1;
      };
    
      _.lastIndexOf = function(array, item, from) {
        if (array == null) return -1;
        var idx = array.length;
        if (typeof from == 'number') {
          idx = from < 0 ? idx + from + 1 : Math.min(idx, from + 1);
        }
        while (--idx >= 0) if (array[idx] === item) return idx;
        return -1;
      };
    
      // Generate an integer Array containing an arithmetic progression. A port of
      // the native Python `range()` function. See
      // [the Python documentation](http://docs.python.org/library/functions.html#range).
      _.range = function(start, stop, step) {
        if (arguments.length <= 1) {
          stop = start || 0;
          start = 0;
        }
        step = step || 1;
    
        var length = Math.max(Math.ceil((stop - start) / step), 0);
        var range = Array(length);
    
        for (var idx = 0; idx < length; idx++, start += step) {
          range[idx] = start;
        }
    
        return range;
      };
    
      // Function (ahem) Functions
      // ------------------
    
      // Reusable constructor function for prototype setting.
      var Ctor = function(){};
    
      // Create a function bound to a given object (assigning `this`, and arguments,
      // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
      // available.
      _.bind = function(func, context) {
        var args, bound;
        if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
        if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
        args = slice.call(arguments, 2);
        bound = function() {
          if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
          Ctor.prototype = func.prototype;
          var self = new Ctor;
          Ctor.prototype = null;
          var result = func.apply(self, args.concat(slice.call(arguments)));
          if (_.isObject(result)) return result;
          return self;
        };
        return bound;
      };
    
      // Partially apply a function by creating a version that has had some of its
      // arguments pre-filled, without changing its dynamic `this` context. _ acts
      // as a placeholder, allowing any combination of arguments to be pre-filled.
      _.partial = function(func) {
        var boundArgs = slice.call(arguments, 1);
        return function() {
          var position = 0;
          var args = boundArgs.slice();
          for (var i = 0, length = args.length; i < length; i++) {
            if (args[i] === _) args[i] = arguments[position++];
          }
          while (position < arguments.length) args.push(arguments[position++]);
          return func.apply(this, args);
        };
      };
    
      // Bind a number of an object's methods to that object. Remaining arguments
      // are the method names to be bound. Useful for ensuring that all callbacks
      // defined on an object belong to it.
      _.bindAll = function(obj) {
        var i, length = arguments.length, key;
        if (length <= 1) throw new Error('bindAll must be passed function names');
        for (i = 1; i < length; i++) {
          key = arguments[i];
          obj[key] = _.bind(obj[key], obj);
        }
        return obj;
      };
    
      // Memoize an expensive function by storing its results.
      _.memoize = function(func, hasher) {
        var memoize = function(key) {
          var cache = memoize.cache;
          var address = hasher ? hasher.apply(this, arguments) : key;
          if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
          return cache[address];
        };
        memoize.cache = {};
        return memoize;
      };
    
      // Delays a function for the given number of milliseconds, and then calls
      // it with the arguments supplied.
      _.delay = function(func, wait) {
        var args = slice.call(arguments, 2);
        return setTimeout(function(){
          return func.apply(null, args);
        }, wait);
      };
    
      // Defers a function, scheduling it to run after the current call stack has
      // cleared.
      _.defer = function(func) {
        return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
      };
    
      // Returns a function, that, when invoked, will only be triggered at most once
      // during a given window of time. Normally, the throttled function will run
      // as much as it can, without ever going more than once per `wait` duration;
      // but if you'd like to disable the execution on the leading edge, pass
      // `{leading: false}`. To disable execution on the trailing edge, ditto.
      _.throttle = function(func, wait, options) {
        var context, args, result;
        var timeout = null;
        var previous = 0;
        if (!options) options = {};
        var later = function() {
          previous = options.leading === false ? 0 : _.now();
          timeout = null;
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        };
        return function() {
          var now = _.now();
          if (!previous && options.leading === false) previous = now;
          var remaining = wait - (now - previous);
          context = this;
          args = arguments;
          if (remaining <= 0 || remaining > wait) {
            clearTimeout(timeout);
            timeout = null;
            previous = now;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
          } else if (!timeout && options.trailing !== false) {
            timeout = setTimeout(later, remaining);
          }
          return result;
        };
      };
    
      // Returns a function, that, as long as it continues to be invoked, will not
      // be triggered. The function will be called after it stops being called for
      // N milliseconds. If `immediate` is passed, trigger the function on the
      // leading edge, instead of the trailing.
      _.debounce = function(func, wait, immediate) {
        var timeout, args, context, timestamp, result;
    
        var later = function() {
          var last = _.now() - timestamp;
    
          if (last < wait && last > 0) {
            timeout = setTimeout(later, wait - last);
          } else {
            timeout = null;
            if (!immediate) {
              result = func.apply(context, args);
              if (!timeout) context = args = null;
            }
          }
        };
    
        return function() {
          context = this;
          args = arguments;
          timestamp = _.now();
          var callNow = immediate && !timeout;
          if (!timeout) timeout = setTimeout(later, wait);
          if (callNow) {
            result = func.apply(context, args);
            context = args = null;
          }
    
          return result;
        };
      };
    
      // Returns the first function passed as an argument to the second,
      // allowing you to adjust arguments, run code before and after, and
      // conditionally execute the original function.
      _.wrap = function(func, wrapper) {
        return _.partial(wrapper, func);
      };
    
      // Returns a negated version of the passed-in predicate.
      _.negate = function(predicate) {
        return function() {
          return !predicate.apply(this, arguments);
        };
      };
    
      // Returns a function that is the composition of a list of functions, each
      // consuming the return value of the function that follows.
      _.compose = function() {
        var args = arguments;
        var start = args.length - 1;
        return function() {
          var i = start;
          var result = args[start].apply(this, arguments);
          while (i--) result = args[i].call(this, result);
          return result;
        };
      };
    
      // Returns a function that will only be executed after being called N times.
      _.after = function(times, func) {
        return function() {
          if (--times < 1) {
            return func.apply(this, arguments);
          }
        };
      };
    
      // Returns a function that will only be executed before being called N times.
      _.before = function(times, func) {
        var memo;
        return function() {
          if (--times > 0) {
            memo = func.apply(this, arguments);
          } else {
            func = null;
          }
          return memo;
        };
      };
    
      // Returns a function that will be executed at most one time, no matter how
      // often you call it. Useful for lazy initialization.
      _.once = _.partial(_.before, 2);
    
      // Object Functions
      // ----------------
    
      // Retrieve the names of an object's properties.
      // Delegates to **ECMAScript 5**'s native `Object.keys`
      _.keys = function(obj) {
        if (!_.isObject(obj)) return [];
        if (nativeKeys) return nativeKeys(obj);
        var keys = [];
        for (var key in obj) if (_.has(obj, key)) keys.push(key);
        return keys;
      };
    
      // Retrieve the values of an object's properties.
      _.values = function(obj) {
        var keys = _.keys(obj);
        var length = keys.length;
        var values = Array(length);
        for (var i = 0; i < length; i++) {
          values[i] = obj[keys[i]];
        }
        return values;
      };
    
      // Convert an object into a list of `[key, value]` pairs.
      _.pairs = function(obj) {
        var keys = _.keys(obj);
        var length = keys.length;
        var pairs = Array(length);
        for (var i = 0; i < length; i++) {
          pairs[i] = [keys[i], obj[keys[i]]];
        }
        return pairs;
      };
    
      // Invert the keys and values of an object. The values must be serializable.
      _.invert = function(obj) {
        var result = {};
        var keys = _.keys(obj);
        for (var i = 0, length = keys.length; i < length; i++) {
          result[obj[keys[i]]] = keys[i];
        }
        return result;
      };
    
      // Return a sorted list of the function names available on the object.
      // Aliased as `methods`
      _.functions = _.methods = function(obj) {
        var names = [];
        for (var key in obj) {
          if (_.isFunction(obj[key])) names.push(key);
        }
        return names.sort();
      };
    
      // Extend a given object with all the properties in passed-in object(s).
      _.extend = function(obj) {
        if (!_.isObject(obj)) return obj;
        var source, prop;
        for (var i = 1, length = arguments.length; i < length; i++) {
          source = arguments[i];
          for (prop in source) {
            if (hasOwnProperty.call(source, prop)) {
                obj[prop] = source[prop];
            }
          }
        }
        return obj;
      };
    
      // Return a copy of the object only containing the whitelisted properties.
      _.pick = function(obj, iteratee, context) {
        var result = {}, key;
        if (obj == null) return result;
        if (_.isFunction(iteratee)) {
          iteratee = createCallback(iteratee, context);
          for (key in obj) {
            var value = obj[key];
            if (iteratee(value, key, obj)) result[key] = value;
          }
        } else {
          var keys = concat.apply([], slice.call(arguments, 1));
          obj = new Object(obj);
          for (var i = 0, length = keys.length; i < length; i++) {
            key = keys[i];
            if (key in obj) result[key] = obj[key];
          }
        }
        return result;
      };
    
       // Return a copy of the object without the blacklisted properties.
      _.omit = function(obj, iteratee, context) {
        if (_.isFunction(iteratee)) {
          iteratee = _.negate(iteratee);
        } else {
          var keys = _.map(concat.apply([], slice.call(arguments, 1)), String);
          iteratee = function(value, key) {
            return !_.contains(keys, key);
          };
        }
        return _.pick(obj, iteratee, context);
      };
    
      // Fill in a given object with default properties.
      _.defaults = function(obj) {
        if (!_.isObject(obj)) return obj;
        for (var i = 1, length = arguments.length; i < length; i++) {
          var source = arguments[i];
          for (var prop in source) {
            if (obj[prop] === void 0) obj[prop] = source[prop];
          }
        }
        return obj;
      };
    
      // Create a (shallow-cloned) duplicate of an object.
      _.clone = function(obj) {
        if (!_.isObject(obj)) return obj;
        return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
      };
    
      // Invokes interceptor with the obj, and then returns obj.
      // The primary purpose of this method is to "tap into" a method chain, in
      // order to perform operations on intermediate results within the chain.
      _.tap = function(obj, interceptor) {
        interceptor(obj);
        return obj;
      };
    
      // Internal recursive comparison function for `isEqual`.
      var eq = function(a, b, aStack, bStack) {
        // Identical objects are equal. `0 === -0`, but they aren't identical.
        // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
        if (a === b) return a !== 0 || 1 / a === 1 / b;
        // A strict comparison is necessary because `null == undefined`.
        if (a == null || b == null) return a === b;
        // Unwrap any wrapped objects.
        if (a instanceof _) a = a._wrapped;
        if (b instanceof _) b = b._wrapped;
        // Compare `[[Class]]` names.
        var className = toString.call(a);
        if (className !== toString.call(b)) return false;
        switch (className) {
          // Strings, numbers, regular expressions, dates, and booleans are compared by value.
          case '[object RegExp]':
          // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
          case '[object String]':
            // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
            // equivalent to `new String("5")`.
            return '' + a === '' + b;
          case '[object Number]':
            // `NaN`s are equivalent, but non-reflexive.
            // Object(NaN) is equivalent to NaN
            if (+a !== +a) return +b !== +b;
            // An `egal` comparison is performed for other numeric values.
            return +a === 0 ? 1 / +a === 1 / b : +a === +b;
          case '[object Date]':
          case '[object Boolean]':
            // Coerce dates and booleans to numeric primitive values. Dates are compared by their
            // millisecond representations. Note that invalid dates with millisecond representations
            // of `NaN` are not equivalent.
            return +a === +b;
        }
        if (typeof a != 'object' || typeof b != 'object') return false;
        // Assume equality for cyclic structures. The algorithm for detecting cyclic
        // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
        var length = aStack.length;
        while (length--) {
          // Linear search. Performance is inversely proportional to the number of
          // unique nested structures.
          if (aStack[length] === a) return bStack[length] === b;
        }
        // Objects with different constructors are not equivalent, but `Object`s
        // from different frames are.
        var aCtor = a.constructor, bCtor = b.constructor;
        if (
          aCtor !== bCtor &&
          // Handle Object.create(x) cases
          'constructor' in a && 'constructor' in b &&
          !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
            _.isFunction(bCtor) && bCtor instanceof bCtor)
        ) {
          return false;
        }
        // Add the first object to the stack of traversed objects.
        aStack.push(a);
        bStack.push(b);
        var size, result;
        // Recursively compare objects and arrays.
        if (className === '[object Array]') {
          // Compare array lengths to determine if a deep comparison is necessary.
          size = a.length;
          result = size === b.length;
          if (result) {
            // Deep compare the contents, ignoring non-numeric properties.
            while (size--) {
              if (!(result = eq(a[size], b[size], aStack, bStack))) break;
            }
          }
        } else {
          // Deep compare objects.
          var keys = _.keys(a), key;
          size = keys.length;
          // Ensure that both objects contain the same number of properties before comparing deep equality.
          result = _.keys(b).length === size;
          if (result) {
            while (size--) {
              // Deep compare each member
              key = keys[size];
              if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
            }
          }
        }
        // Remove the first object from the stack of traversed objects.
        aStack.pop();
        bStack.pop();
        return result;
      };
    
      // Perform a deep comparison to check if two objects are equal.
      _.isEqual = function(a, b) {
        return eq(a, b, [], []);
      };
    
      // Is a given array, string, or object empty?
      // An "empty" object has no enumerable own-properties.
      _.isEmpty = function(obj) {
        if (obj == null) return true;
        if (_.isArray(obj) || _.isString(obj) || _.isArguments(obj)) return obj.length === 0;
        for (var key in obj) if (_.has(obj, key)) return false;
        return true;
      };
    
      // Is a given value a DOM element?
      _.isElement = function(obj) {
        return !!(obj && obj.nodeType === 1);
      };
    
      // Is a given value an array?
      // Delegates to ECMA5's native Array.isArray
      _.isArray = nativeIsArray || function(obj) {
        return toString.call(obj) === '[object Array]';
      };
    
      // Is a given variable an object?
      _.isObject = function(obj) {
        var type = typeof obj;
        return type === 'function' || type === 'object' && !!obj;
      };
    
      // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
      _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
        _['is' + name] = function(obj) {
          return toString.call(obj) === '[object ' + name + ']';
        };
      });
    
      // Define a fallback version of the method in browsers (ahem, IE), where
      // there isn't any inspectable "Arguments" type.
      if (!_.isArguments(arguments)) {
        _.isArguments = function(obj) {
          return _.has(obj, 'callee');
        };
      }
    
      // Optimize `isFunction` if appropriate. Work around an IE 11 bug.
      if (typeof /./ !== 'function') {
        _.isFunction = function(obj) {
          return typeof obj == 'function' || false;
        };
      }
    
      // Is a given object a finite number?
      _.isFinite = function(obj) {
        return isFinite(obj) && !isNaN(parseFloat(obj));
      };
    
      // Is the given value `NaN`? (NaN is the only number which does not equal itself).
      _.isNaN = function(obj) {
        return _.isNumber(obj) && obj !== +obj;
      };
    
      // Is a given value a boolean?
      _.isBoolean = function(obj) {
        return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
      };
    
      // Is a given value equal to null?
      _.isNull = function(obj) {
        return obj === null;
      };
    
      // Is a given variable undefined?
      _.isUndefined = function(obj) {
        return obj === void 0;
      };
    
      // Shortcut function for checking if an object has a given property directly
      // on itself (in other words, not on a prototype).
      _.has = function(obj, key) {
        return obj != null && hasOwnProperty.call(obj, key);
      };
    
      // Utility Functions
      // -----------------
    
      // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
      // previous owner. Returns a reference to the Underscore object.
      _.noConflict = function() {
        root._ = previousUnderscore;
        return this;
      };
    
      // Keep the identity function around for default iteratees.
      _.identity = function(value) {
        return value;
      };
    
      _.constant = function(value) {
        return function() {
          return value;
        };
      };
    
      _.noop = function(){};
    
      _.property = function(key) {
        return function(obj) {
          return obj[key];
        };
      };
    
      // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
      _.matches = function(attrs) {
        var pairs = _.pairs(attrs), length = pairs.length;
        return function(obj) {
          if (obj == null) return !length;
          obj = new Object(obj);
          for (var i = 0; i < length; i++) {
            var pair = pairs[i], key = pair[0];
            if (pair[1] !== obj[key] || !(key in obj)) return false;
          }
          return true;
        };
      };
    
      // Run a function **n** times.
      _.times = function(n, iteratee, context) {
        var accum = Array(Math.max(0, n));
        iteratee = createCallback(iteratee, context, 1);
        for (var i = 0; i < n; i++) accum[i] = iteratee(i);
        return accum;
      };
    
      // Return a random integer between min and max (inclusive).
      _.random = function(min, max) {
        if (max == null) {
          max = min;
          min = 0;
        }
        return min + Math.floor(Math.random() * (max - min + 1));
      };
    
      // A (possibly faster) way to get the current timestamp as an integer.
      _.now = Date.now || function() {
        return new Date().getTime();
      };
    
       // List of HTML entities for escaping.
      var escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '`': '&#x60;'
      };
      var unescapeMap = _.invert(escapeMap);
    
      // Functions for escaping and unescaping strings to/from HTML interpolation.
      var createEscaper = function(map) {
        var escaper = function(match) {
          return map[match];
        };
        // Regexes for identifying a key that needs to be escaped
        var source = '(?:' + _.keys(map).join('|') + ')';
        var testRegexp = RegExp(source);
        var replaceRegexp = RegExp(source, 'g');
        return function(string) {
          string = string == null ? '' : '' + string;
          return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
        };
      };
      _.escape = createEscaper(escapeMap);
      _.unescape = createEscaper(unescapeMap);
    
      // If the value of the named `property` is a function then invoke it with the
      // `object` as context; otherwise, return it.
      _.result = function(object, property) {
        if (object == null) return void 0;
        var value = object[property];
        return _.isFunction(value) ? object[property]() : value;
      };
    
      // Generate a unique integer id (unique within the entire client session).
      // Useful for temporary DOM ids.
      var idCounter = 0;
      _.uniqueId = function(prefix) {
        var id = ++idCounter + '';
        return prefix ? prefix + id : id;
      };
    
      // By default, Underscore uses ERB-style template delimiters, change the
      // following template settings to use alternative delimiters.
      _.templateSettings = {
        evaluate    : /<%([\s\S]+?)%>/g,
        interpolate : /<%=([\s\S]+?)%>/g,
        escape      : /<%-([\s\S]+?)%>/g
      };
    
      // When customizing `templateSettings`, if you don't want to define an
      // interpolation, evaluation or escaping regex, we need one that is
      // guaranteed not to match.
      var noMatch = /(.)^/;
    
      // Certain characters need to be escaped so that they can be put into a
      // string literal.
      var escapes = {
        "'":      "'",
        '\\':     '\\',
        '\r':     'r',
        '\n':     'n',
        '\u2028': 'u2028',
        '\u2029': 'u2029'
      };
    
      var escaper = /\\|'|\r|\n|\u2028|\u2029/g;
    
      var escapeChar = function(match) {
        return '\\' + escapes[match];
      };
    
      // JavaScript micro-templating, similar to John Resig's implementation.
      // Underscore templating handles arbitrary delimiters, preserves whitespace,
      // and correctly escapes quotes within interpolated code.
      // NB: `oldSettings` only exists for backwards compatibility.
      _.template = function(text, settings, oldSettings) {
        if (!settings && oldSettings) settings = oldSettings;
        settings = _.defaults({}, settings, _.templateSettings);
    
        // Combine delimiters into one regular expression via alternation.
        var matcher = RegExp([
          (settings.escape || noMatch).source,
          (settings.interpolate || noMatch).source,
          (settings.evaluate || noMatch).source
        ].join('|') + '|$', 'g');
    
        // Compile the template source, escaping string literals appropriately.
        var index = 0;
        var source = "__p+='";
        text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
          source += text.slice(index, offset).replace(escaper, escapeChar);
          index = offset + match.length;
    
          if (escape) {
            source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
          } else if (interpolate) {
            source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
          } else if (evaluate) {
            source += "';\n" + evaluate + "\n__p+='";
          }
    
          // Adobe VMs need the match returned to produce the correct offest.
          return match;
        });
        source += "';\n";
    
        // If a variable is not specified, place data values in local scope.
        if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';
    
        source = "var __t,__p='',__j=Array.prototype.join," +
          "print=function(){__p+=__j.call(arguments,'');};\n" +
          source + 'return __p;\n';
    
        try {
          var render = new Function(settings.variable || 'obj', '_', source);
        } catch (e) {
          e.source = source;
          throw e;
        }
    
        var template = function(data) {
          return render.call(this, data, _);
        };
    
        // Provide the compiled source as a convenience for precompilation.
        var argument = settings.variable || 'obj';
        template.source = 'function(' + argument + '){\n' + source + '}';
    
        return template;
      };
    
      // Add a "chain" function. Start chaining a wrapped Underscore object.
      _.chain = function(obj) {
        var instance = _(obj);
        instance._chain = true;
        return instance;
      };
    
      // OOP
      // ---------------
      // If Underscore is called as a function, it returns a wrapped object that
      // can be used OO-style. This wrapper holds altered versions of all the
      // underscore functions. Wrapped objects may be chained.
    
      // Helper function to continue chaining intermediate results.
      var result = function(obj) {
        return this._chain ? _(obj).chain() : obj;
      };
    
      // Add your own custom functions to the Underscore object.
      _.mixin = function(obj) {
        _.each(_.functions(obj), function(name) {
          var func = _[name] = obj[name];
          _.prototype[name] = function() {
            var args = [this._wrapped];
            push.apply(args, arguments);
            return result.call(this, func.apply(_, args));
          };
        });
      };
    
      // Add all of the Underscore functions to the wrapper object.
      _.mixin(_);
    
      // Add all mutator Array functions to the wrapper.
      _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
        var method = ArrayProto[name];
        _.prototype[name] = function() {
          var obj = this._wrapped;
          method.apply(obj, arguments);
          if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
          return result.call(this, obj);
        };
      });
    
      // Add all accessor Array functions to the wrapper.
      _.each(['concat', 'join', 'slice'], function(name) {
        var method = ArrayProto[name];
        _.prototype[name] = function() {
          return result.call(this, method.apply(this._wrapped, arguments));
        };
      });
    
      // Extracts the result from a wrapped and chained object.
      _.prototype.value = function() {
        return this._wrapped;
      };
    
      // AMD registration happens at the end for compatibility with AMD loaders
      // that may not enforce next-turn semantics on modules. Even though general
      // practice for AMD registration is to be anonymous, underscore registers
      // as a named module because, like jQuery, it is a base library that is
      // popular enough to be bundled in a third party lib, but not be part of
      // an AMD load request. Those cases could generate an error when an
      // anonymous define() is called outside of a loader request.
      if (typeof define === 'function' && define.amd) {
        define('underscore', [], function() {
          return _;
        });
      }
    }.call(this));
    
  provide("underscore", module.exports);
}(global));

// pakmanager:ws/lib/BufferUtil.fallback
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*!
     * ws: a node.js websocket client
     * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
     * MIT Licensed
     */
    
    module.exports.BufferUtil = {
      merge: function(mergedBuffer, buffers) {
        var offset = 0;
        for (var i = 0, l = buffers.length; i < l; ++i) {
          var buf = buffers[i];
          buf.copy(mergedBuffer, offset);
          offset += buf.length;
        }
      },
      mask: function(source, mask, output, offset, length) {
        var maskNum = mask.readUInt32LE(0, true);
        var i = 0;
        for (; i < length - 3; i += 4) {
          var num = maskNum ^ source.readUInt32LE(i, true);
          if (num < 0) num = 4294967296 + num;
          output.writeUInt32LE(num, offset + i, true);
        }
        switch (length % 4) {
          case 3: output[offset + i + 2] = source[i + 2] ^ mask[2];
          case 2: output[offset + i + 1] = source[i + 1] ^ mask[1];
          case 1: output[offset + i] = source[i] ^ mask[0];
          case 0:;
        }
      },
      unmask: function(data, mask) {
        var maskNum = mask.readUInt32LE(0, true);
        var length = data.length;
        var i = 0;
        for (; i < length - 3; i += 4) {
          var num = maskNum ^ data.readUInt32LE(i, true);
          if (num < 0) num = 4294967296 + num;
          data.writeUInt32LE(num, i, true);
        }
        switch (length % 4) {
          case 3: data[i + 2] = data[i + 2] ^ mask[2];
          case 2: data[i + 1] = data[i + 1] ^ mask[1];
          case 1: data[i] = data[i] ^ mask[0];
          case 0:;
        }
      }
    }
    
  provide("ws/lib/BufferUtil.fallback", module.exports);
}(global));

// pakmanager:ws/lib/Validation.fallback
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*!
     * ws: a node.js websocket client
     * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
     * MIT Licensed
     */
     
    module.exports.Validation = {
      isValidUTF8: function(buffer) {
        return true;
      }
    };
    
    
  provide("ws/lib/Validation.fallback", module.exports);
}(global));

// pakmanager:ws/lib/ErrorCodes
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*!
     * ws: a node.js websocket client
     * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
     * MIT Licensed
     */
    
    module.exports = {
      isValidErrorCode: function(code) {
        return (code >= 1000 && code <= 1011 && code != 1004 && code != 1005 && code != 1006) ||
             (code >= 3000 && code <= 4999);
      },
      1000: 'normal',
      1001: 'going away',
      1002: 'protocol error',
      1003: 'unsupported data',
      1004: 'reserved',
      1005: 'reserved for extensions',
      1006: 'reserved for extensions',
      1007: 'inconsistent or invalid data',
      1008: 'policy violation',
      1009: 'message too big',
      1010: 'extension handshake missing',
      1011: 'an unexpected condition prevented the request from being fulfilled',
    };
  provide("ws/lib/ErrorCodes", module.exports);
}(global));

// pakmanager:ws/lib/BufferUtil
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*!
     * ws: a node.js websocket client
     * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
     * MIT Licensed
     */
    
    try {
      module.exports = require('../build/Release/bufferutil');
    } catch (e) { try {
      module.exports = require('../build/default/bufferutil');
    } catch (e) { try {
      module.exports =  require('ws/lib/BufferUtil.fallback');
    } catch (e) {
      console.error('bufferutil.node seems to not have been built. Run npm install.');
      throw e;
    }}}
    
  provide("ws/lib/BufferUtil", module.exports);
}(global));

// pakmanager:ws/lib/Validation
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*!
     * ws: a node.js websocket client
     * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
     * MIT Licensed
     */
    
    try {
      module.exports = require('../build/Release/validation');
    } catch (e) { try {
      module.exports = require('../build/default/validation');
    } catch (e) { try {
      module.exports =  require('ws/lib/Validation.fallback');
    } catch (e) {
      console.error('validation.node seems to not have been built. Run npm install.');
      throw e;
    }}}
    
  provide("ws/lib/Validation", module.exports);
}(global));

// pakmanager:ws/lib/BufferPool
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*!
     * ws: a node.js websocket client
     * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
     * MIT Licensed
     */
    
    var util = require('util');
    
    function BufferPool(initialSize, growStrategy, shrinkStrategy) {
      if (typeof initialSize === 'function') {
        shrinkStrategy = growStrategy;
        growStrategy = initialSize;
        initialSize = 0;
      }
      else if (typeof initialSize === 'undefined') {
        initialSize = 0;
      }
      this._growStrategy = (growStrategy || function(db, size) {
        return db.used + size;
      }).bind(null, this);
      this._shrinkStrategy = (shrinkStrategy || function(db) {
        return initialSize;
      }).bind(null, this);
      this._buffer = initialSize ? new Buffer(initialSize) : null;
      this._offset = 0;
      this._used = 0;
      this._changeFactor = 0;
      this.__defineGetter__('size', function(){
        return this._buffer == null ? 0 : this._buffer.length;
      });
      this.__defineGetter__('used', function(){
        return this._used;
      });
    }
    
    BufferPool.prototype.get = function(length) {
      if (this._buffer == null || this._offset + length > this._buffer.length) {
        var newBuf = new Buffer(this._growStrategy(length));
        this._buffer = newBuf;
        this._offset = 0;
      }
      this._used += length;
      var buf = this._buffer.slice(this._offset, this._offset + length);
      this._offset += length;
      return buf;
    }
    
    BufferPool.prototype.reset = function(forceNewBuffer) {
      var len = this._shrinkStrategy();
      if (len < this.size) this._changeFactor -= 1;
      if (forceNewBuffer || this._changeFactor < -2) {
        this._changeFactor = 0;
        this._buffer = len ? new Buffer(len) : null;
      }
      this._offset = 0;
      this._used = 0;
    }
    
    module.exports = BufferPool;
    
  provide("ws/lib/BufferPool", module.exports);
}(global));

// pakmanager:ws/lib/Sender
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*!
     * ws: a node.js websocket client
     * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
     * MIT Licensed
     */
    
    var events = require('events')
      , util = require('util')
      , EventEmitter = events.EventEmitter
      , ErrorCodes =  require('ws/lib/ErrorCodes')
      , bufferUtil =  require('ws/lib/BufferUtil').BufferUtil;
    
    /**
     * HyBi Sender implementation
     */
    
    function Sender(socket) {
      this._socket = socket;
      this.firstFragment = true;
    }
    
    /**
     * Inherits from EventEmitter.
     */
    
    util.inherits(Sender, events.EventEmitter);
    
    /**
     * Sends a close instruction to the remote party.
     *
     * @api public
     */
    
    Sender.prototype.close = function(code, data, mask) {
      if (typeof code !== 'undefined') {
        if (typeof code !== 'number' ||
          !ErrorCodes.isValidErrorCode(code)) throw new Error('first argument must be a valid error code number');
      }
      code = code || 1000;
      var dataBuffer = new Buffer(2 + (data ? Buffer.byteLength(data) : 0));
      writeUInt16BE.call(dataBuffer, code, 0);
      if (dataBuffer.length > 2) dataBuffer.write(data, 2);
      this.frameAndSend(0x8, dataBuffer, true, mask);
    };
    
    /**
     * Sends a ping message to the remote party.
     *
     * @api public
     */
    
    Sender.prototype.ping = function(data, options) {
      var mask = options && options.mask;
      this.frameAndSend(0x9, data || '', true, mask);
    };
    
    /**
     * Sends a pong message to the remote party.
     *
     * @api public
     */
    
    Sender.prototype.pong = function(data, options) {
      var mask = options && options.mask;
      this.frameAndSend(0xa, data || '', true, mask);
    };
    
    /**
     * Sends text or binary data to the remote party.
     *
     * @api public
     */
    
    Sender.prototype.send = function(data, options, cb) {
      var finalFragment = options && options.fin === false ? false : true;
      var mask = options && options.mask;
      var opcode = options && options.binary ? 2 : 1;
      if (this.firstFragment === false) opcode = 0;
      else this.firstFragment = false;
      if (finalFragment) this.firstFragment = true
      this.frameAndSend(opcode, data, finalFragment, mask, cb);
    };
    
    /**
     * Frames and sends a piece of data according to the HyBi WebSocket protocol.
     *
     * @api private
     */
    
    Sender.prototype.frameAndSend = function(opcode, data, finalFragment, maskData, cb) {
      var canModifyData = false;
    
      if (!data) {
        try {
          this._socket.write(new Buffer([opcode | (finalFragment ? 0x80 : 0), 0 | (maskData ? 0x80 : 0)].concat(maskData ? [0, 0, 0, 0] : [])), 'binary', cb);
        }
        catch (e) {
          if (typeof cb == 'function') cb(e);
          else this.emit('error', e);
        }
        return;
      }
    
      if (!Buffer.isBuffer(data)) {
        canModifyData = true;
        if (data && (typeof data.byteLength !== 'undefined' || typeof data.buffer !== 'undefined')) {
          data = getArrayBuffer(data);
        } else {
          data = new Buffer(data);
        }
      }
    
      var dataLength = data.length
        , dataOffset = maskData ? 6 : 2
        , secondByte = dataLength;
    
      if (dataLength >= 65536) {
        dataOffset += 8;
        secondByte = 127;
      }
      else if (dataLength > 125) {
        dataOffset += 2;
        secondByte = 126;
      }
    
      var mergeBuffers = dataLength < 32768 || (maskData && !canModifyData);
      var totalLength = mergeBuffers ? dataLength + dataOffset : dataOffset;
      var outputBuffer = new Buffer(totalLength);
      outputBuffer[0] = finalFragment ? opcode | 0x80 : opcode;
    
      switch (secondByte) {
        case 126:
          writeUInt16BE.call(outputBuffer, dataLength, 2);
          break;
        case 127:
          writeUInt32BE.call(outputBuffer, 0, 2);
          writeUInt32BE.call(outputBuffer, dataLength, 6);
      }
    
      if (maskData) {
        outputBuffer[1] = secondByte | 0x80;
        var mask = this._randomMask || (this._randomMask = getRandomMask());
        outputBuffer[dataOffset - 4] = mask[0];
        outputBuffer[dataOffset - 3] = mask[1];
        outputBuffer[dataOffset - 2] = mask[2];
        outputBuffer[dataOffset - 1] = mask[3];
        if (mergeBuffers) {
          bufferUtil.mask(data, mask, outputBuffer, dataOffset, dataLength);
          try {
            this._socket.write(outputBuffer, 'binary', cb);
          }
          catch (e) {
            if (typeof cb == 'function') cb(e);
            else this.emit('error', e);
          }
        }
        else {
          bufferUtil.mask(data, mask, data, 0, dataLength);
          try {
            this._socket.write(outputBuffer, 'binary');
            this._socket.write(data, 'binary', cb);
          }
          catch (e) {
            if (typeof cb == 'function') cb(e);
            else this.emit('error', e);
          }
        }
      }
      else {
        outputBuffer[1] = secondByte;
        if (mergeBuffers) {
          data.copy(outputBuffer, dataOffset);
          try {
            this._socket.write(outputBuffer, 'binary', cb);
          }
          catch (e) {
            if (typeof cb == 'function') cb(e);
            else this.emit('error', e);
          }
        }
        else {
          try {
            this._socket.write(outputBuffer, 'binary');
            this._socket.write(data, 'binary', cb);
          }
          catch (e) {
            if (typeof cb == 'function') cb(e);
            else this.emit('error', e);
          }
        }
      }
    };
    
    module.exports = Sender;
    
    function writeUInt16BE(value, offset) {
      this[offset] = (value & 0xff00)>>8;
      this[offset+1] = value & 0xff;
    }
    
    function writeUInt32BE(value, offset) {
      this[offset] = (value & 0xff000000)>>24;
      this[offset+1] = (value & 0xff0000)>>16;
      this[offset+2] = (value & 0xff00)>>8;
      this[offset+3] = value & 0xff;
    }
    
    function getArrayBuffer(data) {
      // data is either an ArrayBuffer or ArrayBufferView.
      var array = new Uint8Array(data.buffer || data)
        , l = data.byteLength || data.length
        , o = data.byteOffset || 0
        , buffer = new Buffer(l);
      for (var i = 0; i < l; ++i) {
        buffer[i] = array[o+i];
      }
      return buffer;
    }
    
    function getRandomMask() {
      return new Buffer([
        ~~(Math.random() * 255),
        ~~(Math.random() * 255),
        ~~(Math.random() * 255),
        ~~(Math.random() * 255)
      ]);
    }
    
  provide("ws/lib/Sender", module.exports);
}(global));

// pakmanager:ws/lib/Receiver
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*!
     * ws: a node.js websocket client
     * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
     * MIT Licensed
     */
    
    var util = require('util')
      , Validation =  require('ws/lib/Validation').Validation
      , ErrorCodes =  require('ws/lib/ErrorCodes')
      , BufferPool =  require('ws/lib/BufferPool')
      , bufferUtil =  require('ws/lib/BufferUtil').BufferUtil;
    
    /**
     * HyBi Receiver implementation
     */
    
    function Receiver () {
      // memory pool for fragmented messages
      var fragmentedPoolPrevUsed = -1;
      this.fragmentedBufferPool = new BufferPool(1024, function(db, length) {
        return db.used + length;
      }, function(db) {
        return fragmentedPoolPrevUsed = fragmentedPoolPrevUsed >= 0 ?
          (fragmentedPoolPrevUsed + db.used) / 2 :
          db.used;
      });
    
      // memory pool for unfragmented messages
      var unfragmentedPoolPrevUsed = -1;
      this.unfragmentedBufferPool = new BufferPool(1024, function(db, length) {
        return db.used + length;
      }, function(db) {
        return unfragmentedPoolPrevUsed = unfragmentedPoolPrevUsed >= 0 ?
          (unfragmentedPoolPrevUsed + db.used) / 2 :
          db.used;
      });
    
      this.state = {
        activeFragmentedOperation: null,
        lastFragment: false,
        masked: false,
        opcode: 0,
        fragmentedOperation: false
      };
      this.overflow = [];
      this.headerBuffer = new Buffer(10);
      this.expectOffset = 0;
      this.expectBuffer = null;
      this.expectHandler = null;
      this.currentMessage = [];
      this.expectHeader(2, this.processPacket);
      this.dead = false;
    
      this.onerror = function() {};
      this.ontext = function() {};
      this.onbinary = function() {};
      this.onclose = function() {};
      this.onping = function() {};
      this.onpong = function() {};
    }
    
    module.exports = Receiver;
    
    /**
     * Add new data to the parser.
     *
     * @api public
     */
    
    Receiver.prototype.add = function(data) {
      var dataLength = data.length;
      if (dataLength == 0) return;
      if (this.expectBuffer == null) {
        this.overflow.push(data);
        return;
      }
      var toRead = Math.min(dataLength, this.expectBuffer.length - this.expectOffset);
      fastCopy(toRead, data, this.expectBuffer, this.expectOffset);
      this.expectOffset += toRead;
      if (toRead < dataLength) {
        this.overflow.push(data.slice(toRead));
      }
      while (this.expectBuffer && this.expectOffset == this.expectBuffer.length) {
        var bufferForHandler = this.expectBuffer;
        this.expectBuffer = null;
        this.expectOffset = 0;
        this.expectHandler.call(this, bufferForHandler);
      }
    };
    
    /**
     * Releases all resources used by the receiver.
     *
     * @api public
     */
    
    Receiver.prototype.cleanup = function() {
      this.dead = true;
      this.overflow = null;
      this.headerBuffer = null;
      this.expectBuffer = null;
      this.expectHandler = null;
      this.unfragmentedBufferPool = null;
      this.fragmentedBufferPool = null;
      this.state = null;
      this.currentMessage = null;
      this.onerror = null;
      this.ontext = null;
      this.onbinary = null;
      this.onclose = null;
      this.onping = null;
      this.onpong = null;
    };
    
    /**
     * Waits for a certain amount of header bytes to be available, then fires a callback.
     *
     * @api private
     */
    
    Receiver.prototype.expectHeader = function(length, handler) {
      if (length == 0) {
        handler(null);
        return;
      }
      this.expectBuffer = this.headerBuffer.slice(this.expectOffset, this.expectOffset + length);
      this.expectHandler = handler;
      var toRead = length;
      while (toRead > 0 && this.overflow.length > 0) {
        var fromOverflow = this.overflow.pop();
        if (toRead < fromOverflow.length) this.overflow.push(fromOverflow.slice(toRead));
        var read = Math.min(fromOverflow.length, toRead);
        fastCopy(read, fromOverflow, this.expectBuffer, this.expectOffset);
        this.expectOffset += read;
        toRead -= read;
      }
    };
    
    /**
     * Waits for a certain amount of data bytes to be available, then fires a callback.
     *
     * @api private
     */
    
    Receiver.prototype.expectData = function(length, handler) {
      if (length == 0) {
        handler(null);
        return;
      }
      this.expectBuffer = this.allocateFromPool(length, this.state.fragmentedOperation);
      this.expectHandler = handler;
      var toRead = length;
      while (toRead > 0 && this.overflow.length > 0) {
        var fromOverflow = this.overflow.pop();
        if (toRead < fromOverflow.length) this.overflow.push(fromOverflow.slice(toRead));
        var read = Math.min(fromOverflow.length, toRead);
        fastCopy(read, fromOverflow, this.expectBuffer, this.expectOffset);
        this.expectOffset += read;
        toRead -= read;
      }
    };
    
    /**
     * Allocates memory from the buffer pool.
     *
     * @api private
     */
    
    Receiver.prototype.allocateFromPool = function(length, isFragmented) {
      return (isFragmented ? this.fragmentedBufferPool : this.unfragmentedBufferPool).get(length);
    };
    
    /**
     * Start processing a new packet.
     *
     * @api private
     */
    
    Receiver.prototype.processPacket = function (data) {
      if ((data[0] & 0x70) != 0) {
        this.error('reserved fields must be empty', 1002);
        return;
      }
      this.state.lastFragment = (data[0] & 0x80) == 0x80;
      this.state.masked = (data[1] & 0x80) == 0x80;
      var opcode = data[0] & 0xf;
      if (opcode === 0) {
        // continuation frame
        this.state.fragmentedOperation = true;
        this.state.opcode = this.state.activeFragmentedOperation;
        if (!(this.state.opcode == 1 || this.state.opcode == 2)) {
          this.error('continuation frame cannot follow current opcode', 1002);
          return;
        }
      }
      else {
        if (opcode < 3 && this.state.activeFragmentedOperation != null) {
          this.error('data frames after the initial data frame must have opcode 0', 1002);
          return;
        }
        this.state.opcode = opcode;
        if (this.state.lastFragment === false) {
          this.state.fragmentedOperation = true;
          this.state.activeFragmentedOperation = opcode;
        }
        else this.state.fragmentedOperation = false;
      }
      var handler = opcodes[this.state.opcode];
      if (typeof handler == 'undefined') this.error('no handler for opcode ' + this.state.opcode, 1002);
      else {
        handler.start.call(this, data);
      }
    };
    
    /**
     * Endprocessing a packet.
     *
     * @api private
     */
    
    Receiver.prototype.endPacket = function() {
      if (!this.state.fragmentedOperation) this.unfragmentedBufferPool.reset(true);
      else if (this.state.lastFragment) this.fragmentedBufferPool.reset(false);
      this.expectOffset = 0;
      this.expectBuffer = null;
      this.expectHandler = null;
      if (this.state.lastFragment && this.state.opcode === this.state.activeFragmentedOperation) {
        // end current fragmented operation
        this.state.activeFragmentedOperation = null;
      }
      this.state.lastFragment = false;
      this.state.opcode = this.state.activeFragmentedOperation != null ? this.state.activeFragmentedOperation : 0;
      this.state.masked = false;
      this.expectHeader(2, this.processPacket);
    };
    
    /**
     * Reset the parser state.
     *
     * @api private
     */
    
    Receiver.prototype.reset = function() {
      if (this.dead) return;
      this.state = {
        activeFragmentedOperation: null,
        lastFragment: false,
        masked: false,
        opcode: 0,
        fragmentedOperation: false
      };
      this.fragmentedBufferPool.reset(true);
      this.unfragmentedBufferPool.reset(true);
      this.expectOffset = 0;
      this.expectBuffer = null;
      this.expectHandler = null;
      this.overflow = [];
      this.currentMessage = [];
    };
    
    /**
     * Unmask received data.
     *
     * @api private
     */
    
    Receiver.prototype.unmask = function (mask, buf, binary) {
      if (mask != null && buf != null) bufferUtil.unmask(buf, mask);
      if (binary) return buf;
      return buf != null ? buf.toString('utf8') : '';
    };
    
    /**
     * Concatenates a list of buffers.
     *
     * @api private
     */
    
    Receiver.prototype.concatBuffers = function(buffers) {
      var length = 0;
      for (var i = 0, l = buffers.length; i < l; ++i) length += buffers[i].length;
      var mergedBuffer = new Buffer(length);
      bufferUtil.merge(mergedBuffer, buffers);
      return mergedBuffer;
    };
    
    /**
     * Handles an error
     *
     * @api private
     */
    
    Receiver.prototype.error = function (reason, protocolErrorCode) {
      this.reset();
      this.onerror(reason, protocolErrorCode);
      return this;
    };
    
    /**
     * Buffer utilities
     */
    
    function readUInt16BE(start) {
      return (this[start]<<8) +
             this[start+1];
    }
    
    function readUInt32BE(start) {
      return (this[start]<<24) +
             (this[start+1]<<16) +
             (this[start+2]<<8) +
             this[start+3];
    }
    
    function fastCopy(length, srcBuffer, dstBuffer, dstOffset) {
      switch (length) {
        default: srcBuffer.copy(dstBuffer, dstOffset, 0, length); break;
        case 16: dstBuffer[dstOffset+15] = srcBuffer[15];
        case 15: dstBuffer[dstOffset+14] = srcBuffer[14];
        case 14: dstBuffer[dstOffset+13] = srcBuffer[13];
        case 13: dstBuffer[dstOffset+12] = srcBuffer[12];
        case 12: dstBuffer[dstOffset+11] = srcBuffer[11];
        case 11: dstBuffer[dstOffset+10] = srcBuffer[10];
        case 10: dstBuffer[dstOffset+9] = srcBuffer[9];
        case 9: dstBuffer[dstOffset+8] = srcBuffer[8];
        case 8: dstBuffer[dstOffset+7] = srcBuffer[7];
        case 7: dstBuffer[dstOffset+6] = srcBuffer[6];
        case 6: dstBuffer[dstOffset+5] = srcBuffer[5];
        case 5: dstBuffer[dstOffset+4] = srcBuffer[4];
        case 4: dstBuffer[dstOffset+3] = srcBuffer[3];
        case 3: dstBuffer[dstOffset+2] = srcBuffer[2];
        case 2: dstBuffer[dstOffset+1] = srcBuffer[1];
        case 1: dstBuffer[dstOffset] = srcBuffer[0];
      }
    }
    
    /**
     * Opcode handlers
     */
    
    var opcodes = {
      // text
      '1': {
        start: function(data) {
          var self = this;
          // decode length
          var firstLength = data[1] & 0x7f;
          if (firstLength < 126) {
            opcodes['1'].getData.call(self, firstLength);
          }
          else if (firstLength == 126) {
            self.expectHeader(2, function(data) {
              opcodes['1'].getData.call(self, readUInt16BE.call(data, 0));
            });
          }
          else if (firstLength == 127) {
            self.expectHeader(8, function(data) {
              if (readUInt32BE.call(data, 0) != 0) {
                self.error('packets with length spanning more than 32 bit is currently not supported', 1008);
                return;
              }
              opcodes['1'].getData.call(self, readUInt32BE.call(data, 4));
            });
          }
        },
        getData: function(length) {
          var self = this;
          if (self.state.masked) {
            self.expectHeader(4, function(data) {
              var mask = data;
              self.expectData(length, function(data) {
                opcodes['1'].finish.call(self, mask, data);
              });
            });
          }
          else {
            self.expectData(length, function(data) {
              opcodes['1'].finish.call(self, null, data);
            });
          }
        },
        finish: function(mask, data) {
          var packet = this.unmask(mask, data, true);
          if (packet != null) this.currentMessage.push(packet);
          if (this.state.lastFragment) {
            var messageBuffer = this.concatBuffers(this.currentMessage);
            if (!Validation.isValidUTF8(messageBuffer)) {
              this.error('invalid utf8 sequence', 1007);
              return;
            }
            this.ontext(messageBuffer.toString('utf8'), {masked: this.state.masked, buffer: messageBuffer});
            this.currentMessage = [];
          }
          this.endPacket();
        }
      },
      // binary
      '2': {
        start: function(data) {
          var self = this;
          // decode length
          var firstLength = data[1] & 0x7f;
          if (firstLength < 126) {
            opcodes['2'].getData.call(self, firstLength);
          }
          else if (firstLength == 126) {
            self.expectHeader(2, function(data) {
              opcodes['2'].getData.call(self, readUInt16BE.call(data, 0));
            });
          }
          else if (firstLength == 127) {
            self.expectHeader(8, function(data) {
              if (readUInt32BE.call(data, 0) != 0) {
                self.error('packets with length spanning more than 32 bit is currently not supported', 1008);
                return;
              }
              opcodes['2'].getData.call(self, readUInt32BE.call(data, 4, true));
            });
          }
        },
        getData: function(length) {
          var self = this;
          if (self.state.masked) {
            self.expectHeader(4, function(data) {
              var mask = data;
              self.expectData(length, function(data) {
                opcodes['2'].finish.call(self, mask, data);
              });
            });
          }
          else {
            self.expectData(length, function(data) {
              opcodes['2'].finish.call(self, null, data);
            });
          }
        },
        finish: function(mask, data) {
          var packet = this.unmask(mask, data, true);
          if (packet != null) this.currentMessage.push(packet);
          if (this.state.lastFragment) {
            var messageBuffer = this.concatBuffers(this.currentMessage);
            this.onbinary(messageBuffer, {masked: this.state.masked, buffer: messageBuffer});
            this.currentMessage = [];
          }
          this.endPacket();
        }
      },
      // close
      '8': {
        start: function(data) {
          var self = this;
          if (self.state.lastFragment == false) {
            self.error('fragmented close is not supported', 1002);
            return;
          }
    
          // decode length
          var firstLength = data[1] & 0x7f;
          if (firstLength < 126) {
            opcodes['8'].getData.call(self, firstLength);
          }
          else {
            self.error('control frames cannot have more than 125 bytes of data', 1002);
          }
        },
        getData: function(length) {
          var self = this;
          if (self.state.masked) {
            self.expectHeader(4, function(data) {
              var mask = data;
              self.expectData(length, function(data) {
                opcodes['8'].finish.call(self, mask, data);
              });
            });
          }
          else {
            self.expectData(length, function(data) {
              opcodes['8'].finish.call(self, null, data);
            });
          }
        },
        finish: function(mask, data) {
          var self = this;
          data = self.unmask(mask, data, true);
          if (data && data.length == 1) {
            self.error('close packets with data must be at least two bytes long', 1002);
            return;
          }
          var code = data && data.length > 1 ? readUInt16BE.call(data, 0) : 1000;
          if (!ErrorCodes.isValidErrorCode(code)) {
            self.error('invalid error code', 1002);
            return;
          }
          var message = '';
          if (data && data.length > 2) {
            var messageBuffer = data.slice(2);
            if (!Validation.isValidUTF8(messageBuffer)) {
              self.error('invalid utf8 sequence', 1007);
              return;
            }
            message = messageBuffer.toString('utf8');
          }
          this.onclose(code, message, {masked: self.state.masked});
          this.reset();
        },
      },
      // ping
      '9': {
        start: function(data) {
          var self = this;
          if (self.state.lastFragment == false) {
            self.error('fragmented ping is not supported', 1002);
            return;
          }
    
          // decode length
          var firstLength = data[1] & 0x7f;
          if (firstLength < 126) {
            opcodes['9'].getData.call(self, firstLength);
          }
          else {
            self.error('control frames cannot have more than 125 bytes of data', 1002);
          }
        },
        getData: function(length) {
          var self = this;
          if (self.state.masked) {
            self.expectHeader(4, function(data) {
              var mask = data;
              self.expectData(length, function(data) {
                opcodes['9'].finish.call(self, mask, data);
              });
            });
          }
          else {
            self.expectData(length, function(data) {
              opcodes['9'].finish.call(self, null, data);
            });
          }
        },
        finish: function(mask, data) {
          this.onping(this.unmask(mask, data, true), {masked: this.state.masked, binary: true});
          this.endPacket();
        }
      },
      // pong
      '10': {
        start: function(data) {
          var self = this;
          if (self.state.lastFragment == false) {
            self.error('fragmented pong is not supported', 1002);
            return;
          }
    
          // decode length
          var firstLength = data[1] & 0x7f;
          if (firstLength < 126) {
            opcodes['10'].getData.call(self, firstLength);
          }
          else {
            self.error('control frames cannot have more than 125 bytes of data', 1002);
          }
        },
        getData: function(length) {
          var self = this;
          if (this.state.masked) {
            this.expectHeader(4, function(data) {
              var mask = data;
              self.expectData(length, function(data) {
                opcodes['10'].finish.call(self, mask, data);
              });
            });
          }
          else {
            this.expectData(length, function(data) {
              opcodes['10'].finish.call(self, null, data);
            });
          }
        },
        finish: function(mask, data) {
          this.onpong(this.unmask(mask, data, true), {masked: this.state.masked, binary: true});
          this.endPacket();
        }
      }
    }
    
  provide("ws/lib/Receiver", module.exports);
}(global));

// pakmanager:ws/lib/Sender.hixie
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*!
     * ws: a node.js websocket client
     * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
     * MIT Licensed
     */
    
    var events = require('events')
      , util = require('util')
      , EventEmitter = events.EventEmitter;
    
    /**
     * Hixie Sender implementation
     */
    
    function Sender(socket) {
      this.socket = socket;
      this.continuationFrame = false;
      this.isClosed = false;
    }
    
    module.exports = Sender;
    
    /**
     * Inherits from EventEmitter.
     */
    
    util.inherits(Sender, events.EventEmitter);
    
    /**
     * Frames and writes data.
     *
     * @api public
     */
    
    Sender.prototype.send = function(data, options, cb) {
      if (this.isClosed) return;
    
      var isString = typeof data == 'string'
        , length = isString ? Buffer.byteLength(data) : data.length
        , lengthbytes = (length > 127) ? 2 : 1 // assume less than 2**14 bytes
        , writeStartMarker = this.continuationFrame == false
        , writeEndMarker = !options || !(typeof options.fin != 'undefined' && !options.fin)
        , buffer = new Buffer((writeStartMarker ? ((options && options.binary) ? (1 + lengthbytes) : 1) : 0) + length + ((writeEndMarker && !(options && options.binary)) ? 1 : 0))
        , offset = writeStartMarker ? 1 : 0;
    
      if (writeStartMarker) {
        if (options && options.binary) {
          buffer.write('\x80', 'binary');
          // assume length less than 2**14 bytes
          if (lengthbytes > 1)
            buffer.write(String.fromCharCode(128+length/128), offset++, 'binary');
          buffer.write(String.fromCharCode(length&0x7f), offset++, 'binary');
        } else
          buffer.write('\x00', 'binary');
      }
    
      if (isString) buffer.write(data, offset, 'utf8');
      else data.copy(buffer, offset, 0);
    
      if (writeEndMarker) {
        if (options && options.binary) {
          // sending binary, not writing end marker
        } else
          buffer.write('\xff', offset + length, 'binary');
        this.continuationFrame = false;
      }
      else this.continuationFrame = true;
    
      try {
        this.socket.write(buffer, 'binary', cb);
      } catch (e) {
        this.error(e.toString());
      }
    };
    
    /**
     * Sends a close instruction to the remote party.
     *
     * @api public
     */
    
    Sender.prototype.close = function(code, data, mask, cb) {
      if (this.isClosed) return;
      this.isClosed = true;
      try {
        if (this.continuationFrame) this.socket.write(new Buffer([0xff], 'binary'));
        this.socket.write(new Buffer([0xff, 0x00]), 'binary', cb);
      } catch (e) {
        this.error(e.toString());
      }
    };
    
    /**
     * Sends a ping message to the remote party. Not available for hixie.
     *
     * @api public
     */
    
    Sender.prototype.ping = function(data, options) {};
    
    /**
     * Sends a pong message to the remote party. Not available for hixie.
     *
     * @api public
     */
    
    Sender.prototype.pong = function(data, options) {};
    
    /**
     * Handles an error
     *
     * @api private
     */
    
    Sender.prototype.error = function (reason) {
      this.emit('error', reason);
      return this;
    };
    
  provide("ws/lib/Sender.hixie", module.exports);
}(global));

// pakmanager:ws/lib/Receiver.hixie
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*!
     * ws: a node.js websocket client
     * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
     * MIT Licensed
     */
    
    var util = require('util');
    
    /**
     * State constants
     */
    
    var EMPTY = 0
      , BODY = 1;
    var BINARYLENGTH = 2
      , BINARYBODY = 3;
    
    /**
     * Hixie Receiver implementation
     */
    
    function Receiver () {
      this.state = EMPTY;
      this.buffers = [];
      this.messageEnd = -1;
      this.spanLength = 0;
      this.dead = false;
    
      this.onerror = function() {};
      this.ontext = function() {};
      this.onbinary = function() {};
      this.onclose = function() {};
      this.onping = function() {};
      this.onpong = function() {};
    }
    
    module.exports = Receiver;
    
    /**
     * Add new data to the parser.
     *
     * @api public
     */
    
    Receiver.prototype.add = function(data) {
      var self = this;
      function doAdd() {
        if (self.state === EMPTY) {
          if (data.length == 2 && data[0] == 0xFF && data[1] == 0x00) {
            self.reset();
            self.onclose();
            return;
          }
          if (data[0] === 0x80) {
            self.messageEnd = 0;
            self.state = BINARYLENGTH;
            data = data.slice(1);
          } else {
    
          if (data[0] !== 0x00) {
            self.error('payload must start with 0x00 byte', true);
            return;
          }
          data = data.slice(1);
          self.state = BODY;
    
          }
        }
        if (self.state === BINARYLENGTH) {
          var i = 0;
          while ((i < data.length) && (data[i] & 0x80)) {
            self.messageEnd = 128 * self.messageEnd + (data[i] & 0x7f);
            ++i;
          }
          if (i < data.length) {
            self.messageEnd = 128 * self.messageEnd + (data[i] & 0x7f);
            self.state = BINARYBODY;
            ++i;
          }
          if (i > 0)
            data = data.slice(i);
        }
        if (self.state === BINARYBODY) {
          var dataleft = self.messageEnd - self.spanLength;
          if (data.length >= dataleft) {
            // consume the whole buffer to finish the frame
            self.buffers.push(data);
            self.spanLength += dataleft;
            self.messageEnd = dataleft;
            return self.parse();
          }
          // frame's not done even if we consume it all
          self.buffers.push(data);
          self.spanLength += data.length;
          return;
        }
        self.buffers.push(data);
        if ((self.messageEnd = bufferIndex(data, 0xFF)) != -1) {
          self.spanLength += self.messageEnd;
          return self.parse();
        }
        else self.spanLength += data.length;
      }
      while(data) data = doAdd();
    };
    
    /**
     * Releases all resources used by the receiver.
     *
     * @api public
     */
    
    Receiver.prototype.cleanup = function() {
      this.dead = true;
      this.state = EMPTY;
      this.buffers = [];
    };
    
    /**
     * Process buffered data.
     *
     * @api public
     */
    
    Receiver.prototype.parse = function() {
      var output = new Buffer(this.spanLength);
      var outputIndex = 0;
      for (var bi = 0, bl = this.buffers.length; bi < bl - 1; ++bi) {
        var buffer = this.buffers[bi];
        buffer.copy(output, outputIndex);
        outputIndex += buffer.length;
      }
      var lastBuffer = this.buffers[this.buffers.length - 1];
      if (this.messageEnd > 0) lastBuffer.copy(output, outputIndex, 0, this.messageEnd);
      if (this.state !== BODY) --this.messageEnd;
      var tail = null;
      if (this.messageEnd < lastBuffer.length - 1) {
        tail = lastBuffer.slice(this.messageEnd + 1);
      }
      this.reset();
      this.ontext(output.toString('utf8'));
      return tail;
    };
    
    /**
     * Handles an error
     *
     * @api private
     */
    
    Receiver.prototype.error = function (reason, terminate) {
      this.reset();
      this.onerror(reason, terminate);
      return this;
    };
    
    /**
     * Reset parser state
     *
     * @api private
     */
    
    Receiver.prototype.reset = function (reason) {
      if (this.dead) return;
      this.state = EMPTY;
      this.buffers = [];
      this.messageEnd = -1;
      this.spanLength = 0;
    };
    
    /**
     * Internal api
     */
    
    function bufferIndex(buffer, byte) {
      for (var i = 0, l = buffer.length; i < l; ++i) {
        if (buffer[i] === byte) return i;
      }
      return -1;
    }
    
  provide("ws/lib/Receiver.hixie", module.exports);
}(global));

// pakmanager:ws/lib/WebSocket
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*!
     * ws: a node.js websocket client
     * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
     * MIT Licensed
     */
    
    var util = require('util')
      , events = require('events')
      , http = require('http')
      , https = require('https')
      , crypto = require('crypto')
      , url = require('url')
      , stream = require('stream')
      , Options = require('options')
      , Sender =  require('ws/lib/Sender')
      , Receiver =  require('ws/lib/Receiver')
      , SenderHixie =  require('ws/lib/Sender.hixie')
      , ReceiverHixie =  require('ws/lib/Receiver.hixie');
    
    /**
     * Constants
     */
    
    // Default protocol version
    
    var protocolVersion = 13;
    
    // Close timeout
    
    var closeTimeout = 30000; // Allow 5 seconds to terminate the connection cleanly
    
    /**
     * WebSocket implementation
     */
    
    function WebSocket(address, protocols, options) {
    
      if (protocols && !Array.isArray(protocols) && 'object' == typeof protocols) {
        // accept the "options" Object as the 2nd argument
        options = protocols;
        protocols = null;
      }
      if ('string' == typeof protocols) {
        protocols = [ protocols ];
      }
      if (!Array.isArray(protocols)) {
        protocols = [];
      }
      // TODO: actually handle the `Sub-Protocols` part of the WebSocket client
    
      this._socket = null;
      this.bytesReceived = 0;
      this.readyState = null;
      this.supports = {};
    
      if (Array.isArray(address)) {
        initAsServerClient.apply(this, address.concat(options));
      } else {
        initAsClient.apply(this, [address, protocols, options]);
      }
    }
    
    /**
     * Inherits from EventEmitter.
     */
    
    util.inherits(WebSocket, events.EventEmitter);
    
    /**
     * Ready States
     */
    
    ["CONNECTING", "OPEN", "CLOSING", "CLOSED"].forEach(function (state, index) {
        WebSocket.prototype[state] = WebSocket[state] = index;
    });
    
    /**
     * Gracefully closes the connection, after sending a description message to the server
     *
     * @param {Object} data to be sent to the server
     * @api public
     */
    
    WebSocket.prototype.close = function(code, data) {
      if (this.readyState == WebSocket.CLOSING || this.readyState == WebSocket.CLOSED) return;
      if (this.readyState == WebSocket.CONNECTING) {
        this.readyState = WebSocket.CLOSED;
        return;
      }
      try {
        this.readyState = WebSocket.CLOSING;
        this._closeCode = code;
        this._closeMessage = data;
        var mask = !this._isServer;
        this._sender.close(code, data, mask);
      }
      catch (e) {
        this.emit('error', e);
      }
      finally {
        this.terminate();
      }
    }
    
    /**
     * Pause the client stream
     *
     * @api public
     */
    
    WebSocket.prototype.pause = function() {
      if (this.readyState != WebSocket.OPEN) throw new Error('not opened');
      return this._socket.pause();
    }
    
    /**
     * Sends a ping
     *
     * @param {Object} data to be sent to the server
     * @param {Object} Members - mask: boolean, binary: boolean
     * @param {boolean} dontFailWhenClosed indicates whether or not to throw if the connection isnt open
     * @api public
     */
    
    WebSocket.prototype.ping = function(data, options, dontFailWhenClosed) {
      if (this.readyState != WebSocket.OPEN) {
        if (dontFailWhenClosed === true) return;
        throw new Error('not opened');
      }
      options = options || {};
      if (typeof options.mask == 'undefined') options.mask = !this._isServer;
      this._sender.ping(data, options);
    }
    
    /**
     * Sends a pong
     *
     * @param {Object} data to be sent to the server
     * @param {Object} Members - mask: boolean, binary: boolean
     * @param {boolean} dontFailWhenClosed indicates whether or not to throw if the connection isnt open
     * @api public
     */
    
    WebSocket.prototype.pong = function(data, options, dontFailWhenClosed) {
      if (this.readyState != WebSocket.OPEN) {
        if (dontFailWhenClosed === true) return;
        throw new Error('not opened');
      }
      options = options || {};
      if (typeof options.mask == 'undefined') options.mask = !this._isServer;
      this._sender.pong(data, options);
    }
    
    /**
     * Resume the client stream
     *
     * @api public
     */
    
    WebSocket.prototype.resume = function() {
      if (this.readyState != WebSocket.OPEN) throw new Error('not opened');
      return this._socket.resume();
    }
    
    /**
     * Sends a piece of data
     *
     * @param {Object} data to be sent to the server
     * @param {Object} Members - mask: boolean, binary: boolean
     * @param {function} Optional callback which is executed after the send completes
     * @api public
     */
    
    WebSocket.prototype.send = function(data, options, cb) {
      if (typeof options == 'function') {
        cb = options;
        options = {};
      }
      if (this.readyState != WebSocket.OPEN) {
        if (typeof cb == 'function') cb(new Error('not opened'));
        else throw new Error('not opened');
        return;
      }
      if (!data) data = '';
      if (this._queue) {
        var self = this;
        this._queue.push(function() { self.send(data, options, cb); });
        return;
      }
      options = options || {};
      options.fin = true;
      if (typeof options.binary == 'undefined') {
        options.binary = (data instanceof ArrayBuffer || data instanceof Buffer ||
          data instanceof Uint8Array ||
          data instanceof Uint16Array ||
          data instanceof Uint32Array ||
          data instanceof Int8Array ||
          data instanceof Int16Array ||
          data instanceof Int32Array ||
          data instanceof Float32Array ||
          data instanceof Float64Array);
      }
      if (typeof options.mask == 'undefined') options.mask = !this._isServer;
      var readable = typeof stream.Readable == 'function' ? stream.Readable : stream.Stream;
      if (data instanceof readable) {
        startQueue(this);
        var self = this;
        sendStream(this, data, options, function(error) {
          process.nextTick(function() { executeQueueSends(self); });
          if (typeof cb == 'function') cb(error);
        });
      }
      else this._sender.send(data, options, cb);
    }
    
    /**
     * Streams data through calls to a user supplied function
     *
     * @param {Object} Members - mask: boolean, binary: boolean
     * @param {function} 'function (error, send)' which is executed on successive ticks of which send is 'function (data, final)'.
     * @api public
     */
    
    WebSocket.prototype.stream = function(options, cb) {
      if (typeof options == 'function') {
        cb = options;
        options = {};
      }
      var self = this;
      if (typeof cb != 'function') throw new Error('callback must be provided');
      if (this.readyState != WebSocket.OPEN) {
        if (typeof cb == 'function') cb(new Error('not opened'));
        else throw new Error('not opened');
        return;
      }
      if (this._queue) {
        this._queue.push(function() { self.stream(options, cb); });
        return;
      }
      options = options || {};
      if (typeof options.mask == 'undefined') options.mask = !this._isServer;
      startQueue(this);
      var send = function(data, final) {
        try {
          if (self.readyState != WebSocket.OPEN) throw new Error('not opened');
          options.fin = final === true;
          self._sender.send(data, options);
          if (!final) process.nextTick(cb.bind(null, null, send));
          else executeQueueSends(self);
        }
        catch (e) {
          if (typeof cb == 'function') cb(e);
          else {
            delete self._queue;
            self.emit('error', e);
          }
        }
      }
      process.nextTick(cb.bind(null, null, send));
    }
    
    /**
     * Immediately shuts down the connection
     *
     * @api public
     */
    
    WebSocket.prototype.terminate = function() {
      if (this.readyState == WebSocket.CLOSED) return;
      if (this._socket) {
        try {
          // End the connection
          this._socket.end();
        }
        catch (e) {
          // Socket error during end() call, so just destroy it right now
          cleanupWebsocketResources.call(this, true);
          return;
        }
    
        // Add a timeout to ensure that the connection is completely
        // cleaned up within 30 seconds, even if the clean close procedure
        // fails for whatever reason
        this._closeTimer = setTimeout(cleanupWebsocketResources.bind(this, true), closeTimeout);
      }
      else if (this.readyState == WebSocket.CONNECTING) {
        cleanupWebsocketResources.call(this, true);
      }
    };
    
    /**
     * Expose bufferedAmount
     *
     * @api public
     */
    
    Object.defineProperty(WebSocket.prototype, 'bufferedAmount', {
      get: function get() {
        var amount = 0;
        if (this._socket) {
          amount = this._socket.bufferSize || 0;
        }
        return amount;
      }
    });
    
    /**
     * Emulates the W3C Browser based WebSocket interface using function members.
     *
     * @see http://dev.w3.org/html5/websockets/#the-websocket-interface
     * @api public
     */
    
    ['open', 'error', 'close', 'message'].forEach(function(method) {
      Object.defineProperty(WebSocket.prototype, 'on' + method, {
        /**
         * Returns the current listener
         *
         * @returns {Mixed} the set function or undefined
         * @api public
         */
    
        get: function get() {
          var listener = this.listeners(method)[0];
          return listener ? (listener._listener ? listener._listener : listener) : undefined;
        },
    
        /**
         * Start listening for events
         *
         * @param {Function} listener the listener
         * @returns {Mixed} the set function or undefined
         * @api public
         */
    
        set: function set(listener) {
          this.removeAllListeners(method);
          this.addEventListener(method, listener);
        }
      });
    });
    
    /**
     * Emulates the W3C Browser based WebSocket interface using addEventListener.
     *
     * @see https://developer.mozilla.org/en/DOM/element.addEventListener
     * @see http://dev.w3.org/html5/websockets/#the-websocket-interface
     * @api public
     */
    WebSocket.prototype.addEventListener = function(method, listener) {
      var target = this;
      if (typeof listener === 'function') {
        if (method === 'message') {
          function onMessage (data, flags) {
            listener.call(this, new MessageEvent(data, flags.binary ? 'Binary' : 'Text', target));
          }
          // store a reference so we can return the original function from the addEventListener hook
          onMessage._listener = listener;
          this.on(method, onMessage);
        } else if (method === 'close') {
          function onClose (code, message) {
            listener.call(this, new CloseEvent(code, message, target));
          }
          // store a reference so we can return the original function from the addEventListener hook
          onClose._listener = listener;
          this.on(method, onClose);
        } else if (method === 'error') {
          function onError (event) {
            event.target = target;
            listener.call(this, event);
          }
          // store a reference so we can return the original function from the addEventListener hook
          onError._listener = listener;
          this.on(method, onError);
        } else if (method === 'open') {
          function onOpen () {
            listener.call(this, new OpenEvent(target));
          }
          // store a reference so we can return the original function from the addEventListener hook
          onOpen._listener = listener;
          this.on(method, onOpen);
        } else {
          this.on(method, listener);
        }
      }
    }
    
    module.exports = WebSocket;
    
    /**
     * W3C MessageEvent
     *
     * @see http://www.w3.org/TR/html5/comms.html
     * @api private
     */
    
    function MessageEvent(dataArg, typeArg, target) {
      this.data = dataArg;
      this.type = typeArg;
      this.target = target;
    }
    
    /**
     * W3C CloseEvent
     *
     * @see http://www.w3.org/TR/html5/comms.html
     * @api private
     */
    
    function CloseEvent(code, reason, target) {
      this.wasClean = (typeof code == 'undefined' || code == 1000);
      this.code = code;
      this.reason = reason;
      this.target = target;
    }
    
    /**
     * W3C OpenEvent
     *
     * @see http://www.w3.org/TR/html5/comms.html
     * @api private
     */
    
    function OpenEvent(target) {
      this.target = target;
    }
    
    /**
     * Entirely private apis,
     * which may or may not be bound to a sepcific WebSocket instance.
     */
    
    function initAsServerClient(req, socket, upgradeHead, options) {
      options = new Options({
        protocolVersion: protocolVersion,
        protocol: null
      }).merge(options);
    
      // expose state properties
      this.protocol = options.value.protocol;
      this.protocolVersion = options.value.protocolVersion;
      this.supports.binary = (this.protocolVersion != 'hixie-76');
      this.upgradeReq = req;
      this.readyState = WebSocket.CONNECTING;
      this._isServer = true;
    
      // establish connection
      if (options.value.protocolVersion == 'hixie-76') establishConnection.call(this, ReceiverHixie, SenderHixie, socket, upgradeHead);
      else establishConnection.call(this, Receiver, Sender, socket, upgradeHead);
    }
    
    function initAsClient(address, protocols, options) {
      options = new Options({
        origin: null,
        protocolVersion: protocolVersion,
        host: null,
        headers: null,
        protocol: null,
        agent: null,
    
        // ssl-related options
        pfx: null,
        key: null,
        passphrase: null,
        cert: null,
        ca: null,
        ciphers: null,
        rejectUnauthorized: null
      }).merge(options);
      if (options.value.protocolVersion != 8 && options.value.protocolVersion != 13) {
        throw new Error('unsupported protocol version');
      }
    
      // verify url and establish http class
      var serverUrl = url.parse(address);
      var isUnixSocket = serverUrl.protocol === 'ws+unix:';
      if (!serverUrl.host && !isUnixSocket) throw new Error('invalid url');
      var isSecure = serverUrl.protocol === 'wss:' || serverUrl.protocol === 'https:';
      var httpObj = isSecure ? https : http;
      var port = serverUrl.port || (isSecure ? 443 : 80);
      var auth = serverUrl.auth;
    
      // expose state properties
      this._isServer = false;
      this.url = address;
      this.protocolVersion = options.value.protocolVersion;
      this.supports.binary = (this.protocolVersion != 'hixie-76');
    
      // begin handshake
      var key = new Buffer(options.value.protocolVersion + '-' + Date.now()).toString('base64');
      var shasum = crypto.createHash('sha1');
      shasum.update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
      var expectedServerKey = shasum.digest('base64');
    
      var agent = options.value.agent;
    
      var headerHost = serverUrl.hostname;
      // Append port number to Host and Origin header, only if specified in the url and non-default
      if(serverUrl.port) {
        if((isSecure && (port != 443)) || (!isSecure && (port != 80))){
          headerHost = headerHost + ':' + port;
        }
      }
    
      var requestOptions = {
        port: port,
        host: serverUrl.hostname,
        headers: {
          'Connection': 'Upgrade',
          'Upgrade': 'websocket',
          'Host': headerHost,
          'Origin': headerHost,
          'Sec-WebSocket-Version': options.value.protocolVersion,
          'Sec-WebSocket-Key': key
        }
      };
    
      // If we have basic auth.
      if (auth) {
        requestOptions.headers['Authorization'] = 'Basic ' + new Buffer(auth).toString('base64');
      }
    
      if (options.value.protocol) {
        requestOptions.headers['Sec-WebSocket-Protocol'] = options.value.protocol;
      }
    
      if (options.value.host) {
        requestOptions.headers['Host'] = options.value.host;
      }
    
      if (options.value.headers) {
        for (var header in options.value.headers) {
           if (options.value.headers.hasOwnProperty(header)) {
            requestOptions.headers[header] = options.value.headers[header];
           }
        }
      }
    
      if (options.isDefinedAndNonNull('pfx')
       || options.isDefinedAndNonNull('key')
       || options.isDefinedAndNonNull('passphrase')
       || options.isDefinedAndNonNull('cert')
       || options.isDefinedAndNonNull('ca')
       || options.isDefinedAndNonNull('ciphers')
       || options.isDefinedAndNonNull('rejectUnauthorized')) {
    
        if (options.isDefinedAndNonNull('pfx')) requestOptions.pfx = options.value.pfx;
        if (options.isDefinedAndNonNull('key')) requestOptions.key = options.value.key;
        if (options.isDefinedAndNonNull('passphrase')) requestOptions.passphrase = options.value.passphrase;
        if (options.isDefinedAndNonNull('cert')) requestOptions.cert = options.value.cert;
        if (options.isDefinedAndNonNull('ca')) requestOptions.ca = options.value.ca;
        if (options.isDefinedAndNonNull('ciphers')) requestOptions.ciphers = options.value.ciphers;
        if (options.isDefinedAndNonNull('rejectUnauthorized')) requestOptions.rejectUnauthorized = options.value.rejectUnauthorized;
    
        if (!agent) {
            // global agent ignores client side certificates
            agent = new httpObj.Agent(requestOptions);
        }
      }
    
      requestOptions.path = serverUrl.path || '/';
    
      if (agent) {
        requestOptions.agent = agent;
      }
    
      if (isUnixSocket) {
        requestOptions.socketPath = serverUrl.pathname;
      }
      if (options.value.origin) {
        if (options.value.protocolVersion < 13) requestOptions.headers['Sec-WebSocket-Origin'] = options.value.origin;
        else requestOptions.headers['Origin'] = options.value.origin;
      }
    
      var self = this;
      var req = httpObj.request(requestOptions);
    
      req.on('error', function(error) {
        self.emit('error', error);
        cleanupWebsocketResources.call(this, error);
      });
    
      req.once('response', function(res) {
        if (!self.emit('unexpected-response', req, res)) {
          var error = new Error('unexpected server response (' + res.statusCode + ')');
          req.abort();
          self.emit('error', error);
        }
        cleanupWebsocketResources.call(this, error);
      });
    
      req.once('upgrade', function(res, socket, upgradeHead) {
        if (self.readyState == WebSocket.CLOSED) {
          // client closed before server accepted connection
          self.emit('close');
          self.removeAllListeners();
          socket.end();
          return;
        }
        var serverKey = res.headers['sec-websocket-accept'];
        if (typeof serverKey == 'undefined' || serverKey !== expectedServerKey) {
          self.emit('error', 'invalid server key');
          self.removeAllListeners();
          socket.end();
          return;
        }
    
        var serverProt = res.headers['sec-websocket-protocol'];
        var protList = (options.value.protocol || "").split(/, */);
        var protError = null;
        if (!options.value.protocol && serverProt) {
            protError = 'server sent a subprotocol even though none requested';
        } else if (options.value.protocol && !serverProt) {
            protError = 'server sent no subprotocol even though requested';
        } else if (serverProt && protList.indexOf(serverProt) === -1) {
            protError = 'server responded with an invalid protocol';
        }
        if (protError) {
            self.emit('error', protError);
            self.removeAllListeners();
            socket.end();
            return;
        } else if (serverProt) {
            self.protocol = serverProt;
        }
    
        establishConnection.call(self, Receiver, Sender, socket, upgradeHead);
    
        // perform cleanup on http resources
        req.removeAllListeners();
        req = null;
        agent = null;
      });
    
      req.end();
      this.readyState = WebSocket.CONNECTING;
    }
    
    function establishConnection(ReceiverClass, SenderClass, socket, upgradeHead) {
      this._socket = socket;
      socket.setTimeout(0);
      socket.setNoDelay(true);
      var self = this;
      this._receiver = new ReceiverClass();
    
      // socket cleanup handlers
      socket.on('end', cleanupWebsocketResources.bind(this));
      socket.on('close', cleanupWebsocketResources.bind(this));
      socket.on('error', cleanupWebsocketResources.bind(this));
    
      // ensure that the upgradeHead is added to the receiver
      function firstHandler(data) {
        if (self.readyState != WebSocket.OPEN) return;
        if (upgradeHead && upgradeHead.length > 0) {
          self.bytesReceived += upgradeHead.length;
          var head = upgradeHead;
          upgradeHead = null;
          self._receiver.add(head);
        }
        dataHandler = realHandler;
        if (data) {
          self.bytesReceived += data.length;
          self._receiver.add(data);
        }
      }
      // subsequent packets are pushed straight to the receiver
      function realHandler(data) {
        if (data) self.bytesReceived += data.length;
        self._receiver.add(data);
      }
      var dataHandler = firstHandler;
      // if data was passed along with the http upgrade,
      // this will schedule a push of that on to the receiver.
      // this has to be done on next tick, since the caller
      // hasn't had a chance to set event handlers on this client
      // object yet.
      process.nextTick(firstHandler);
    
      // receiver event handlers
      self._receiver.ontext = function (data, flags) {
        flags = flags || {};
        self.emit('message', data, flags);
      };
      self._receiver.onbinary = function (data, flags) {
        flags = flags || {};
        flags.binary = true;
        self.emit('message', data, flags);
      };
      self._receiver.onping = function(data, flags) {
        flags = flags || {};
        self.pong(data, {mask: !self._isServer, binary: flags.binary === true}, true);
        self.emit('ping', data, flags);
      };
      self._receiver.onpong = function(data, flags) {
        self.emit('pong', data, flags);
      };
      self._receiver.onclose = function(code, data, flags) {
        flags = flags || {};
        self.close(code, data);
      };
      self._receiver.onerror = function(reason, errorCode) {
        // close the connection when the receiver reports a HyBi error code
        self.close(typeof errorCode != 'undefined' ? errorCode : 1002, '');
        self.emit('error', reason, errorCode);
      };
    
      // finalize the client
      this._sender = new SenderClass(socket);
      this._sender.on('error', function(error) {
        self.close(1002, '');
        self.emit('error', error);
      });
      this.readyState = WebSocket.OPEN;
      this.emit('open');
    
      socket.on('data', dataHandler);
    }
    
    function startQueue(instance) {
      instance._queue = instance._queue || [];
    }
    
    function executeQueueSends(instance) {
      var queue = instance._queue;
      if (typeof queue == 'undefined') return;
      delete instance._queue;
      for (var i = 0, l = queue.length; i < l; ++i) {
        queue[i]();
      }
    }
    
    function sendStream(instance, stream, options, cb) {
      stream.on('data', function(data) {
        if (instance.readyState != WebSocket.OPEN) {
          if (typeof cb == 'function') cb(new Error('not opened'));
          else {
            delete instance._queue;
            instance.emit('error', new Error('not opened'));
          }
          return;
        }
        options.fin = false;
        instance._sender.send(data, options);
      });
      stream.on('end', function() {
        if (instance.readyState != WebSocket.OPEN) {
          if (typeof cb == 'function') cb(new Error('not opened'));
          else {
            delete instance._queue;
            instance.emit('error', new Error('not opened'));
          }
          return;
        }
        options.fin = true;
        instance._sender.send(null, options);
        if (typeof cb == 'function') cb(null);
      });
    }
    
    function cleanupWebsocketResources(error) {
      if (this.readyState == WebSocket.CLOSED) return;
      var emitClose = this.readyState != WebSocket.CONNECTING;
      this.readyState = WebSocket.CLOSED;
    
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
      if (emitClose) this.emit('close', this._closeCode || 1000, this._closeMessage || '');
    
      if (this._socket) {
        this._socket.removeAllListeners();
        // catch all socket error after removing all standard handlers
        var socket = this._socket;
        this._socket.on('error', function() {
          try { socket.destroy(); } catch (e) {}
        });
        try {
          if (!error) this._socket.end();
          else this._socket.destroy();
        }
        catch (e) { /* Ignore termination errors */ }
        this._socket = null;
      }
      if (this._sender) {
        this._sender.removeAllListeners();
        this._sender = null;
      }
      if (this._receiver) {
        this._receiver.cleanup();
        this._receiver = null;
      }
      this.removeAllListeners();
      this.on('error', function() {}); // catch all errors after this
      delete this._queue;
    }
    
  provide("ws/lib/WebSocket", module.exports);
}(global));

// pakmanager:ws/lib/WebSocketServer
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*!
     * ws: a node.js websocket client
     * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
     * MIT Licensed
     */
    
    var util = require('util')
      , events = require('events')
      , http = require('http')
      , crypto = require('crypto')
      , Options = require('options')
      , WebSocket =  require('ws/lib/WebSocket')
      , tls = require('tls')
      , url = require('url');
    
    /**
     * WebSocket Server implementation
     */
    
    function WebSocketServer(options, callback) {
      options = new Options({
        host: '0.0.0.0',
        port: null,
        server: null,
        verifyClient: null,
        handleProtocols: null,
        path: null,
        noServer: false,
        disableHixie: false,
        clientTracking: true
      }).merge(options);
    
      if (!options.isDefinedAndNonNull('port') && !options.isDefinedAndNonNull('server') && !options.value.noServer) {
        throw new TypeError('`port` or a `server` must be provided');
      }
    
      var self = this;
    
      if (options.isDefinedAndNonNull('port')) {
        this._server = http.createServer(function (req, res) {
          res.writeHead(200, {'Content-Type': 'text/plain'});
          res.end('Not implemented');
        });
        this._server.listen(options.value.port, options.value.host, callback);
        this._closeServer = function() { if (self._server) self._server.close(); };
      }
      else if (options.value.server) {
        this._server = options.value.server;
        if (options.value.path) {
          // take note of the path, to avoid collisions when multiple websocket servers are
          // listening on the same http server
          if (this._server._webSocketPaths && options.value.server._webSocketPaths[options.value.path]) {
            throw new Error('two instances of WebSocketServer cannot listen on the same http server path');
          }
          if (typeof this._server._webSocketPaths !== 'object') {
            this._server._webSocketPaths = {};
          }
          this._server._webSocketPaths[options.value.path] = 1;
        }
      }
      if (this._server) this._server.once('listening', function() { self.emit('listening'); });
    
      if (typeof this._server != 'undefined') {
        this._server.on('error', function(error) {
          self.emit('error', error)
        });
        this._server.on('upgrade', function(req, socket, upgradeHead) {
          //copy upgradeHead to avoid retention of large slab buffers used in node core
          var head = new Buffer(upgradeHead.length);
          upgradeHead.copy(head);
    
          self.handleUpgrade(req, socket, head, function(client) {
            self.emit('connection'+req.url, client);
            self.emit('connection', client);
          });
        });
      }
    
      this.options = options.value;
      this.path = options.value.path;
      this.clients = [];
    }
    
    /**
     * Inherits from EventEmitter.
     */
    
    util.inherits(WebSocketServer, events.EventEmitter);
    
    /**
     * Immediately shuts down the connection.
     *
     * @api public
     */
    
    WebSocketServer.prototype.close = function() {
      // terminate all associated clients
      var error = null;
      try {
        for (var i = 0, l = this.clients.length; i < l; ++i) {
          this.clients[i].terminate();
        }
      }
      catch (e) {
        error = e;
      }
    
      // remove path descriptor, if any
      if (this.path && this._server._webSocketPaths) {
        delete this._server._webSocketPaths[this.path];
        if (Object.keys(this._server._webSocketPaths).length == 0) {
          delete this._server._webSocketPaths;
        }
      }
    
      // close the http server if it was internally created
      try {
        if (typeof this._closeServer !== 'undefined') {
          this._closeServer();
        }
      }
      finally {
        delete this._server;
      }
      if (error) throw error;
    }
    
    /**
     * Handle a HTTP Upgrade request.
     *
     * @api public
     */
    
    WebSocketServer.prototype.handleUpgrade = function(req, socket, upgradeHead, cb) {
      // check for wrong path
      if (this.options.path) {
        var u = url.parse(req.url);
        if (u && u.pathname !== this.options.path) return;
      }
    
      if (typeof req.headers.upgrade === 'undefined' || req.headers.upgrade.toLowerCase() !== 'websocket') {
        abortConnection(socket, 400, 'Bad Request');
        return;
      }
    
      if (req.headers['sec-websocket-key1']) handleHixieUpgrade.apply(this, arguments);
      else handleHybiUpgrade.apply(this, arguments);
    }
    
    module.exports = WebSocketServer;
    
    /**
     * Entirely private apis,
     * which may or may not be bound to a sepcific WebSocket instance.
     */
    
    function handleHybiUpgrade(req, socket, upgradeHead, cb) {
      // handle premature socket errors
      var errorHandler = function() {
        try { socket.destroy(); } catch (e) {}
      }
      socket.on('error', errorHandler);
    
      // verify key presence
      if (!req.headers['sec-websocket-key']) {
        abortConnection(socket, 400, 'Bad Request');
        return;
      }
    
      // verify version
      var version = parseInt(req.headers['sec-websocket-version']);
      if ([8, 13].indexOf(version) === -1) {
        abortConnection(socket, 400, 'Bad Request');
        return;
      }
    
      // verify protocol
      var protocols = req.headers['sec-websocket-protocol'];
    
      // verify client
      var origin = version < 13 ?
        req.headers['sec-websocket-origin'] :
        req.headers['origin'];
    
      // handler to call when the connection sequence completes
      var self = this;
      var completeHybiUpgrade2 = function(protocol) {
    
        // calc key
        var key = req.headers['sec-websocket-key'];
        var shasum = crypto.createHash('sha1');
        shasum.update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
        key = shasum.digest('base64');
    
        var headers = [
            'HTTP/1.1 101 Switching Protocols'
          , 'Upgrade: websocket'
          , 'Connection: Upgrade'
          , 'Sec-WebSocket-Accept: ' + key
        ];
    
        if (typeof protocol != 'undefined') {
          headers.push('Sec-WebSocket-Protocol: ' + protocol);
        }
    
        // allows external modification/inspection of handshake headers
        self.emit('headers', headers);
    
        socket.setTimeout(0);
        socket.setNoDelay(true);
        try {
          socket.write(headers.concat('', '').join('\r\n'));
        }
        catch (e) {
          // if the upgrade write fails, shut the connection down hard
          try { socket.destroy(); } catch (e) {}
          return;
        }
    
        var client = new WebSocket([req, socket, upgradeHead], {
          protocolVersion: version,
          protocol: protocol
        });
    
        if (self.options.clientTracking) {
          self.clients.push(client);
          client.on('close', function() {
            var index = self.clients.indexOf(client);
            if (index != -1) {
              self.clients.splice(index, 1);
            }
          });
        }
    
        // signal upgrade complete
        socket.removeListener('error', errorHandler);
        cb(client);
      }
    
      // optionally call external protocol selection handler before
      // calling completeHybiUpgrade2
      var completeHybiUpgrade1 = function() {
        // choose from the sub-protocols
        if (typeof self.options.handleProtocols == 'function') {
            var protList = (protocols || "").split(/, */);
            var callbackCalled = false;
            var res = self.options.handleProtocols(protList, function(result, protocol) {
              callbackCalled = true;
              if (!result) abortConnection(socket, 404, 'Unauthorized')
              else completeHybiUpgrade2(protocol);
            });
            if (!callbackCalled) {
                // the handleProtocols handler never called our callback
                abortConnection(socket, 501, 'Could not process protocols');
            }
            return;
        } else {
            if (typeof protocols !== 'undefined') {
                completeHybiUpgrade2(protocols.split(/, */)[0]);
            }
            else {
                completeHybiUpgrade2();
            }
        }
      }
    
      // optionally call external client verification handler
      if (typeof this.options.verifyClient == 'function') {
        var info = {
          origin: origin,
          secure: typeof req.connection.authorized !== 'undefined' || typeof req.connection.encrypted !== 'undefined',
          req: req
        };
        if (this.options.verifyClient.length == 2) {
          this.options.verifyClient(info, function(result, code, name) {
            if (typeof code === 'undefined') code = 401;
            if (typeof name === 'undefined') name = http.STATUS_CODES[code];
    
            if (!result) abortConnection(socket, code, name);
            else completeHybiUpgrade1();
          });
          return;
        }
        else if (!this.options.verifyClient(info)) {
          abortConnection(socket, 401, 'Unauthorized');
          return;
        }
      }
    
      completeHybiUpgrade1();
    }
    
    function handleHixieUpgrade(req, socket, upgradeHead, cb) {
      // handle premature socket errors
      var errorHandler = function() {
        try { socket.destroy(); } catch (e) {}
      }
      socket.on('error', errorHandler);
    
      // bail if options prevent hixie
      if (this.options.disableHixie) {
        abortConnection(socket, 401, 'Hixie support disabled');
        return;
      }
    
      // verify key presence
      if (!req.headers['sec-websocket-key2']) {
        abortConnection(socket, 400, 'Bad Request');
        return;
      }
    
      var origin = req.headers['origin']
        , self = this;
    
      // setup handshake completion to run after client has been verified
      var onClientVerified = function() {
        var wshost;
        if (!req.headers['x-forwarded-host'])
            wshost = req.headers.host;
        else
            wshost = req.headers['x-forwarded-host'];
        var location = ((req.headers['x-forwarded-proto'] === 'https' || socket.encrypted) ? 'wss' : 'ws') + '://' + wshost + req.url
          , protocol = req.headers['sec-websocket-protocol'];
    
        // handshake completion code to run once nonce has been successfully retrieved
        var completeHandshake = function(nonce, rest) {
          // calculate key
          var k1 = req.headers['sec-websocket-key1']
            , k2 = req.headers['sec-websocket-key2']
            , md5 = crypto.createHash('md5');
    
          [k1, k2].forEach(function (k) {
            var n = parseInt(k.replace(/[^\d]/g, ''))
              , spaces = k.replace(/[^ ]/g, '').length;
            if (spaces === 0 || n % spaces !== 0){
              abortConnection(socket, 400, 'Bad Request');
              return;
            }
            n /= spaces;
            md5.update(String.fromCharCode(
              n >> 24 & 0xFF,
              n >> 16 & 0xFF,
              n >> 8  & 0xFF,
              n       & 0xFF));
          });
          md5.update(nonce.toString('binary'));
    
          var headers = [
              'HTTP/1.1 101 Switching Protocols'
            , 'Upgrade: WebSocket'
            , 'Connection: Upgrade'
            , 'Sec-WebSocket-Location: ' + location
          ];
          if (typeof protocol != 'undefined') headers.push('Sec-WebSocket-Protocol: ' + protocol);
          if (typeof origin != 'undefined') headers.push('Sec-WebSocket-Origin: ' + origin);
    
          socket.setTimeout(0);
          socket.setNoDelay(true);
          try {
            // merge header and hash buffer
            var headerBuffer = new Buffer(headers.concat('', '').join('\r\n'));
            var hashBuffer = new Buffer(md5.digest('binary'), 'binary');
            var handshakeBuffer = new Buffer(headerBuffer.length + hashBuffer.length);
            headerBuffer.copy(handshakeBuffer, 0);
            hashBuffer.copy(handshakeBuffer, headerBuffer.length);
    
            // do a single write, which - upon success - causes a new client websocket to be setup
            socket.write(handshakeBuffer, 'binary', function(err) {
              if (err) return; // do not create client if an error happens
              var client = new WebSocket([req, socket, rest], {
                protocolVersion: 'hixie-76',
                protocol: protocol
              });
              if (self.options.clientTracking) {
                self.clients.push(client);
                client.on('close', function() {
                  var index = self.clients.indexOf(client);
                  if (index != -1) {
                    self.clients.splice(index, 1);
                  }
                });
              }
    
              // signal upgrade complete
              socket.removeListener('error', errorHandler);
              cb(client);
            });
          }
          catch (e) {
            try { socket.destroy(); } catch (e) {}
            return;
          }
        }
    
        // retrieve nonce
        var nonceLength = 8;
        if (upgradeHead && upgradeHead.length >= nonceLength) {
          var nonce = upgradeHead.slice(0, nonceLength);
          var rest = upgradeHead.length > nonceLength ? upgradeHead.slice(nonceLength) : null;
          completeHandshake.call(self, nonce, rest);
        }
        else {
          // nonce not present in upgradeHead, so we must wait for enough data
          // data to arrive before continuing
          var nonce = new Buffer(nonceLength);
          upgradeHead.copy(nonce, 0);
          var received = upgradeHead.length;
          var rest = null;
          var handler = function (data) {
            var toRead = Math.min(data.length, nonceLength - received);
            if (toRead === 0) return;
            data.copy(nonce, received, 0, toRead);
            received += toRead;
            if (received == nonceLength) {
              socket.removeListener('data', handler);
              if (toRead < data.length) rest = data.slice(toRead);
              completeHandshake.call(self, nonce, rest);
            }
          }
          socket.on('data', handler);
        }
      }
    
      // verify client
      if (typeof this.options.verifyClient == 'function') {
        var info = {
          origin: origin,
          secure: typeof req.connection.authorized !== 'undefined' || typeof req.connection.encrypted !== 'undefined',
          req: req
        };
        if (this.options.verifyClient.length == 2) {
          var self = this;
          this.options.verifyClient(info, function(result, code, name) {
            if (typeof code === 'undefined') code = 401;
            if (typeof name === 'undefined') name = http.STATUS_CODES[code];
    
            if (!result) abortConnection(socket, code, name);
            else onClientVerified.apply(self);
          });
          return;
        }
        else if (!this.options.verifyClient(info)) {
          abortConnection(socket, 401, 'Unauthorized');
          return;
        }
      }
    
      // no client verification required
      onClientVerified();
    }
    
    function abortConnection(socket, code, name) {
      try {
        var response = [
          'HTTP/1.1 ' + code + ' ' + name,
          'Content-type: text/html'
        ];
        socket.write(response.concat('', '').join('\r\n'));
      }
      catch (e) { /* ignore errors - we've aborted this connection */ }
      finally {
        // ensure that an early aborted connection is shut down completely
        try { socket.destroy(); } catch (e) {}
      }
    }
    
  provide("ws/lib/WebSocketServer", module.exports);
}(global));

// pakmanager:ws
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*!
     * ws: a node.js websocket client
     * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
     * MIT Licensed
     */
    
    module.exports =  require('ws/lib/WebSocket');
    module.exports.Server =  require('ws/lib/WebSocketServer');
    module.exports.Sender =  require('ws/lib/Sender');
    module.exports.Receiver =  require('ws/lib/Receiver');
    
    module.exports.createServer = function (options, connectionListener) {
      var server = new module.exports.Server(options);
      if (typeof connectionListener === 'function') {
        server.on('connection', connectionListener);
      }
      return server;
    };
    
    module.exports.connect = module.exports.createConnection = function (address, openListener) {
      var client = new module.exports(address);
      if (typeof openListener === 'function') {
        client.on('open', openListener);
      }
      return client;
    };
    
  provide("ws", module.exports);
}(global));