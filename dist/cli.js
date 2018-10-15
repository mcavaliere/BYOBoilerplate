#!/usr/bin/env node
'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = _interopDefault(require('fs'));
var constants = _interopDefault(require('constants'));
var stream = _interopDefault(require('stream'));
var util = _interopDefault(require('util'));
var assert = _interopDefault(require('assert'));
var path = _interopDefault(require('path'));
var os = _interopDefault(require('os'));
var mkdirp = _interopDefault(require('mkdirp'));

var minimist = function (args, opts) {
  if (!opts) opts = {};
  var flags = {
    bools: {},
    strings: {},
    unknownFn: null
  };

  if (typeof opts['unknown'] === 'function') {
    flags.unknownFn = opts['unknown'];
  }

  if (typeof opts['boolean'] === 'boolean' && opts['boolean']) {
    flags.allBools = true;
  } else {
    [].concat(opts['boolean']).filter(Boolean).forEach(function (key) {
      flags.bools[key] = true;
    });
  }

  var aliases = {};
  Object.keys(opts.alias || {}).forEach(function (key) {
    aliases[key] = [].concat(opts.alias[key]);
    aliases[key].forEach(function (x) {
      aliases[x] = [key].concat(aliases[key].filter(function (y) {
        return x !== y;
      }));
    });
  });
  [].concat(opts.string).filter(Boolean).forEach(function (key) {
    flags.strings[key] = true;

    if (aliases[key]) {
      flags.strings[aliases[key]] = true;
    }
  });
  var defaults = opts['default'] || {};
  var argv = {
    _: []
  };
  Object.keys(flags.bools).forEach(function (key) {
    setArg(key, defaults[key] === undefined ? false : defaults[key]);
  });
  var notFlags = [];

  if (args.indexOf('--') !== -1) {
    notFlags = args.slice(args.indexOf('--') + 1);
    args = args.slice(0, args.indexOf('--'));
  }

  function argDefined(key, arg) {
    return flags.allBools && /^--[^=]+$/.test(arg) || flags.strings[key] || flags.bools[key] || aliases[key];
  }

  function setArg(key, val, arg) {
    if (arg && flags.unknownFn && !argDefined(key, arg)) {
      if (flags.unknownFn(arg) === false) return;
    }

    var value = !flags.strings[key] && isNumber(val) ? Number(val) : val;
    setKey(argv, key.split('.'), value);
    (aliases[key] || []).forEach(function (x) {
      setKey(argv, x.split('.'), value);
    });
  }

  function setKey(obj, keys, value) {
    var o = obj;
    keys.slice(0, -1).forEach(function (key) {
      if (o[key] === undefined) o[key] = {};
      o = o[key];
    });
    var key = keys[keys.length - 1];

    if (o[key] === undefined || flags.bools[key] || typeof o[key] === 'boolean') {
      o[key] = value;
    } else if (Array.isArray(o[key])) {
      o[key].push(value);
    } else {
      o[key] = [o[key], value];
    }
  }

  function aliasIsBoolean(key) {
    return aliases[key].some(function (x) {
      return flags.bools[x];
    });
  }

  for (var i = 0; i < args.length; i++) {
    var arg = args[i];

    if (/^--.+=/.test(arg)) {
      // Using [\s\S] instead of . because js doesn't support the
      // 'dotall' regex modifier. See:
      // http://stackoverflow.com/a/1068308/13216
      var m = arg.match(/^--([^=]+)=([\s\S]*)$/);
      var key = m[1];
      var value = m[2];

      if (flags.bools[key]) {
        value = value !== 'false';
      }

      setArg(key, value, arg);
    } else if (/^--no-.+/.test(arg)) {
      var key = arg.match(/^--no-(.+)/)[1];
      setArg(key, false, arg);
    } else if (/^--.+/.test(arg)) {
      var key = arg.match(/^--(.+)/)[1];
      var next = args[i + 1];

      if (next !== undefined && !/^-/.test(next) && !flags.bools[key] && !flags.allBools && (aliases[key] ? !aliasIsBoolean(key) : true)) {
        setArg(key, next, arg);
        i++;
      } else if (/^(true|false)$/.test(next)) {
        setArg(key, next === 'true', arg);
        i++;
      } else {
        setArg(key, flags.strings[key] ? '' : true, arg);
      }
    } else if (/^-[^-]+/.test(arg)) {
      var letters = arg.slice(1, -1).split('');
      var broken = false;

      for (var j = 0; j < letters.length; j++) {
        var next = arg.slice(j + 2);

        if (next === '-') {
          setArg(letters[j], next, arg);
          continue;
        }

        if (/[A-Za-z]/.test(letters[j]) && /=/.test(next)) {
          setArg(letters[j], next.split('=')[1], arg);
          broken = true;
          break;
        }

        if (/[A-Za-z]/.test(letters[j]) && /-?\d+(\.\d*)?(e-?\d+)?$/.test(next)) {
          setArg(letters[j], next, arg);
          broken = true;
          break;
        }

        if (letters[j + 1] && letters[j + 1].match(/\W/)) {
          setArg(letters[j], arg.slice(j + 2), arg);
          broken = true;
          break;
        } else {
          setArg(letters[j], flags.strings[letters[j]] ? '' : true, arg);
        }
      }

      var key = arg.slice(-1)[0];

      if (!broken && key !== '-') {
        if (args[i + 1] && !/^(-|--)[^-]/.test(args[i + 1]) && !flags.bools[key] && (aliases[key] ? !aliasIsBoolean(key) : true)) {
          setArg(key, args[i + 1], arg);
          i++;
        } else if (args[i + 1] && /true|false/.test(args[i + 1])) {
          setArg(key, args[i + 1] === 'true', arg);
          i++;
        } else {
          setArg(key, flags.strings[key] ? '' : true, arg);
        }
      }
    } else {
      if (!flags.unknownFn || flags.unknownFn(arg) !== false) {
        argv._.push(flags.strings['_'] || !isNumber(arg) ? arg : Number(arg));
      }

      if (opts.stopEarly) {
        argv._.push.apply(argv._, args.slice(i + 1));

        break;
      }
    }
  }

  Object.keys(defaults).forEach(function (key) {
    if (!hasKey(argv, key.split('.'))) {
      setKey(argv, key.split('.'), defaults[key]);
      (aliases[key] || []).forEach(function (x) {
        setKey(argv, x.split('.'), defaults[key]);
      });
    }
  });

  if (opts['--']) {
    argv['--'] = new Array();
    notFlags.forEach(function (key) {
      argv['--'].push(key);
    });
  } else {
    notFlags.forEach(function (key) {
      argv._.push(key);
    });
  }

  return argv;
};

function hasKey(obj, keys) {
  var o = obj;
  keys.slice(0, -1).forEach(function (key) {
    o = o[key] || {};
  });
  var key = keys[keys.length - 1];
  return key in o;
}

function isNumber(x) {
  if (typeof x === 'number') return true;
  if (/^0x[0-9a-f]+$/i.test(x)) return true;
  return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(x);
}

let Constants$1 = {
  CONFIG_FILE_NAME: 'byobconfig.json'
};
Constants$1 = { ...Constants$1,
  CONFIG_FILE_PATH: "./".concat(Constants$1.CONFIG_FILE_NAME),
  TEMPLATE_DIR_PATH: 'templates'
};
var Constants$2 = Constants$1;

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var fromCallback = function (fn) {
  return Object.defineProperty(function () {
    if (typeof arguments[arguments.length - 1] === 'function') fn.apply(this, arguments);else {
      return new Promise((resolve, reject) => {
        arguments[arguments.length] = (err, res) => {
          if (err) return reject(err);
          resolve(res);
        };

        arguments.length++;
        fn.apply(this, arguments);
      });
    }
  }, 'name', {
    value: fn.name
  });
};

var fromPromise = function (fn) {
  return Object.defineProperty(function () {
    const cb = arguments[arguments.length - 1];
    if (typeof cb !== 'function') return fn.apply(this, arguments);else fn.apply(this, arguments).then(r => cb(null, r), cb);
  }, 'name', {
    value: fn.name
  });
};

var universalify = {
  fromCallback: fromCallback,
  fromPromise: fromPromise
};

var _global = createCommonjsModule(function (module) {
  // https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
  var global = module.exports = typeof window != 'undefined' && window.Math == Math ? window : typeof self != 'undefined' && self.Math == Math ? self // eslint-disable-next-line no-new-func
  : Function('return this')();
  if (typeof __g == 'number') __g = global; // eslint-disable-line no-undef
});

var _core = createCommonjsModule(function (module) {
  var core = module.exports = {
    version: '2.5.7'
  };
  if (typeof __e == 'number') __e = core; // eslint-disable-line no-undef
});
var _core_1 = _core.version;

var _isObject = function (it) {
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};

var _anObject = function (it) {
  if (!_isObject(it)) throw TypeError(it + ' is not an object!');
  return it;
};

var _fails = function (exec) {
  try {
    return !!exec();
  } catch (e) {
    return true;
  }
};

var _descriptors = !_fails(function () {
  return Object.defineProperty({}, 'a', {
    get: function () {
      return 7;
    }
  }).a != 7;
});

var document = _global.document; // typeof document.createElement is 'object' in old IE

var is = _isObject(document) && _isObject(document.createElement);

var _domCreate = function (it) {
  return is ? document.createElement(it) : {};
};

var _ie8DomDefine = !_descriptors && !_fails(function () {
  return Object.defineProperty(_domCreate('div'), 'a', {
    get: function () {
      return 7;
    }
  }).a != 7;
});

// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string

var _toPrimitive = function (it, S) {
  if (!_isObject(it)) return it;
  var fn, val;
  if (S && typeof (fn = it.toString) == 'function' && !_isObject(val = fn.call(it))) return val;
  if (typeof (fn = it.valueOf) == 'function' && !_isObject(val = fn.call(it))) return val;
  if (!S && typeof (fn = it.toString) == 'function' && !_isObject(val = fn.call(it))) return val;
  throw TypeError("Can't convert object to primitive value");
};

var dP = Object.defineProperty;
var f = _descriptors ? Object.defineProperty : function defineProperty(O, P, Attributes) {
  _anObject(O);
  P = _toPrimitive(P, true);
  _anObject(Attributes);
  if (_ie8DomDefine) try {
    return dP(O, P, Attributes);
  } catch (e) {
    /* empty */
  }
  if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported!');
  if ('value' in Attributes) O[P] = Attributes.value;
  return O;
};
var _objectDp = {
  f: f
};

var _propertyDesc = function (bitmap, value) {
  return {
    enumerable: !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable: !(bitmap & 4),
    value: value
  };
};

var _hide = _descriptors ? function (object, key, value) {
  return _objectDp.f(object, key, _propertyDesc(1, value));
} : function (object, key, value) {
  object[key] = value;
  return object;
};

var hasOwnProperty = {}.hasOwnProperty;

var _has = function (it, key) {
  return hasOwnProperty.call(it, key);
};

var id = 0;
var px = Math.random();

var _uid = function (key) {
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};

var _redefine = createCommonjsModule(function (module) {
  var SRC = _uid('src');
  var TO_STRING = 'toString';
  var $toString = Function[TO_STRING];
  var TPL = ('' + $toString).split(TO_STRING);

  _core.inspectSource = function (it) {
    return $toString.call(it);
  };

  (module.exports = function (O, key, val, safe) {
    var isFunction = typeof val == 'function';
    if (isFunction) _has(val, 'name') || _hide(val, 'name', key);
    if (O[key] === val) return;
    if (isFunction) _has(val, SRC) || _hide(val, SRC, O[key] ? '' + O[key] : TPL.join(String(key)));

    if (O === _global) {
      O[key] = val;
    } else if (!safe) {
      delete O[key];
      _hide(O, key, val);
    } else if (O[key]) {
      O[key] = val;
    } else {
      _hide(O, key, val);
    } // add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative

  })(Function.prototype, TO_STRING, function toString() {
    return typeof this == 'function' && this[SRC] || $toString.call(this);
  });
});

var _aFunction = function (it) {
  if (typeof it != 'function') throw TypeError(it + ' is not a function!');
  return it;
};

var _ctx = function (fn, that, length) {
  _aFunction(fn);
  if (that === undefined) return fn;

  switch (length) {
    case 1:
      return function (a) {
        return fn.call(that, a);
      };

    case 2:
      return function (a, b) {
        return fn.call(that, a, b);
      };

    case 3:
      return function (a, b, c) {
        return fn.call(that, a, b, c);
      };
  }

  return function ()
  /* ...args */
  {
    return fn.apply(that, arguments);
  };
};

var PROTOTYPE = 'prototype';

var $export = function (type, name, source) {
  var IS_FORCED = type & $export.F;
  var IS_GLOBAL = type & $export.G;
  var IS_STATIC = type & $export.S;
  var IS_PROTO = type & $export.P;
  var IS_BIND = type & $export.B;
  var target = IS_GLOBAL ? _global : IS_STATIC ? _global[name] || (_global[name] = {}) : (_global[name] || {})[PROTOTYPE];
  var exports = IS_GLOBAL ? _core : _core[name] || (_core[name] = {});
  var expProto = exports[PROTOTYPE] || (exports[PROTOTYPE] = {});
  var key, own, out, exp;
  if (IS_GLOBAL) source = name;

  for (key in source) {
    // contains in native
    own = !IS_FORCED && target && target[key] !== undefined; // export native or passed

    out = (own ? target : source)[key]; // bind timers to global for call from export context

    exp = IS_BIND && own ? _ctx(out, _global) : IS_PROTO && typeof out == 'function' ? _ctx(Function.call, out) : out; // extend global

    if (target) _redefine(target, key, out, type & $export.U); // export

    if (exports[key] != out) _hide(exports, key, exp);
    if (IS_PROTO && expProto[key] != out) expProto[key] = out;
  }
};

_global.core = _core; // type bitmap

$export.F = 1; // forced

$export.G = 2; // global

$export.S = 4; // static

$export.P = 8; // proto

$export.B = 16; // bind

$export.W = 32; // wrap

$export.U = 64; // safe

$export.R = 128; // real proto method for `library`

var _export = $export;

// 7.2.1 RequireObjectCoercible(argument)
var _defined = function (it) {
  if (it == undefined) throw TypeError("Can't call method on  " + it);
  return it;
};

var _toObject = function (it) {
  return Object(_defined(it));
};

var _strictMethod = function (method, arg) {
  return !!method && _fails(function () {
    // eslint-disable-next-line no-useless-call
    arg ? method.call(null, function () {
      /* empty */
    }, 1) : method.call(null);
  });
};

var $sort = [].sort;
var test = [1, 2, 3];
_export(_export.P + _export.F * (_fails(function () {
  // IE8-
  test.sort(undefined);
}) || !_fails(function () {
  // V8 bug
  test.sort(null); // Old WebKit
}) || !_strictMethod($sort)), 'Array', {
  // 22.1.3.25 Array.prototype.sort(comparefn)
  sort: function sort(comparefn) {
    return comparefn === undefined ? $sort.call(_toObject(this)) : $sort.call(_toObject(this), _aFunction(comparefn));
  }
});

var fs_1 = clone(fs);

function clone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Object) var copy = {
    __proto__: obj.__proto__
  };else var copy = Object.create(null);
  Object.getOwnPropertyNames(obj).forEach(function (key) {
    Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
  });
  return copy;
}

var origCwd = process.cwd;
var cwd = null;
var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;

process.cwd = function () {
  if (!cwd) cwd = origCwd.call(process);
  return cwd;
};

try {
  process.cwd();
} catch (er) {}

var chdir = process.chdir;

process.chdir = function (d) {
  cwd = null;
  chdir.call(process, d);
};

var polyfills = patch;

function patch(fs$$1) {
  // (re-)implement some things that are known busted or missing.
  // lchmod, broken prior to 0.6.2
  // back-port the fix here.
  if (constants.hasOwnProperty('O_SYMLINK') && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
    patchLchmod(fs$$1);
  } // lutimes implementation, or no-op


  if (!fs$$1.lutimes) {
    patchLutimes(fs$$1);
  } // https://github.com/isaacs/node-graceful-fs/issues/4
  // Chown should not fail on einval or eperm if non-root.
  // It should not fail on enosys ever, as this just indicates
  // that a fs doesn't support the intended operation.


  fs$$1.chown = chownFix(fs$$1.chown);
  fs$$1.fchown = chownFix(fs$$1.fchown);
  fs$$1.lchown = chownFix(fs$$1.lchown);
  fs$$1.chmod = chmodFix(fs$$1.chmod);
  fs$$1.fchmod = chmodFix(fs$$1.fchmod);
  fs$$1.lchmod = chmodFix(fs$$1.lchmod);
  fs$$1.chownSync = chownFixSync(fs$$1.chownSync);
  fs$$1.fchownSync = chownFixSync(fs$$1.fchownSync);
  fs$$1.lchownSync = chownFixSync(fs$$1.lchownSync);
  fs$$1.chmodSync = chmodFixSync(fs$$1.chmodSync);
  fs$$1.fchmodSync = chmodFixSync(fs$$1.fchmodSync);
  fs$$1.lchmodSync = chmodFixSync(fs$$1.lchmodSync);
  fs$$1.stat = statFix(fs$$1.stat);
  fs$$1.fstat = statFix(fs$$1.fstat);
  fs$$1.lstat = statFix(fs$$1.lstat);
  fs$$1.statSync = statFixSync(fs$$1.statSync);
  fs$$1.fstatSync = statFixSync(fs$$1.fstatSync);
  fs$$1.lstatSync = statFixSync(fs$$1.lstatSync); // if lchmod/lchown do not exist, then make them no-ops

  if (!fs$$1.lchmod) {
    fs$$1.lchmod = function (path$$1, mode, cb) {
      if (cb) process.nextTick(cb);
    };

    fs$$1.lchmodSync = function () {};
  }

  if (!fs$$1.lchown) {
    fs$$1.lchown = function (path$$1, uid, gid, cb) {
      if (cb) process.nextTick(cb);
    };

    fs$$1.lchownSync = function () {};
  } // on Windows, A/V software can lock the directory, causing this
  // to fail with an EACCES or EPERM if the directory contains newly
  // created files.  Try again on failure, for up to 60 seconds.
  // Set the timeout this long because some Windows Anti-Virus, such as Parity
  // bit9, may lock files for up to a minute, causing npm package install
  // failures. Also, take care to yield the scheduler. Windows scheduling gives
  // CPU to a busy looping process, which can cause the program causing the lock
  // contention to be starved of CPU by node, so the contention doesn't resolve.


  if (platform === "win32") {
    fs$$1.rename = function (fs$rename) {
      return function (from, to, cb) {
        var start = Date.now();
        var backoff = 0;
        fs$rename(from, to, function CB(er) {
          if (er && (er.code === "EACCES" || er.code === "EPERM") && Date.now() - start < 60000) {
            setTimeout(function () {
              fs$$1.stat(to, function (stater, st) {
                if (stater && stater.code === "ENOENT") fs$rename(from, to, CB);else cb(er);
              });
            }, backoff);
            if (backoff < 100) backoff += 10;
            return;
          }

          if (cb) cb(er);
        });
      };
    }(fs$$1.rename);
  } // if read() returns EAGAIN, then just try it again.


  fs$$1.read = function (fs$read) {
    return function (fd, buffer, offset, length, position, callback_) {
      var callback;

      if (callback_ && typeof callback_ === 'function') {
        var eagCounter = 0;

        callback = function (er, _, __) {
          if (er && er.code === 'EAGAIN' && eagCounter < 10) {
            eagCounter++;
            return fs$read.call(fs$$1, fd, buffer, offset, length, position, callback);
          }

          callback_.apply(this, arguments);
        };
      }

      return fs$read.call(fs$$1, fd, buffer, offset, length, position, callback);
    };
  }(fs$$1.read);

  fs$$1.readSync = function (fs$readSync) {
    return function (fd, buffer, offset, length, position) {
      var eagCounter = 0;

      while (true) {
        try {
          return fs$readSync.call(fs$$1, fd, buffer, offset, length, position);
        } catch (er) {
          if (er.code === 'EAGAIN' && eagCounter < 10) {
            eagCounter++;
            continue;
          }

          throw er;
        }
      }
    };
  }(fs$$1.readSync);
}

function patchLchmod(fs$$1) {
  fs$$1.lchmod = function (path$$1, mode, callback) {
    fs$$1.open(path$$1, constants.O_WRONLY | constants.O_SYMLINK, mode, function (err, fd) {
      if (err) {
        if (callback) callback(err);
        return;
      } // prefer to return the chmod error, if one occurs,
      // but still try to close, and report closing errors if they occur.


      fs$$1.fchmod(fd, mode, function (err) {
        fs$$1.close(fd, function (err2) {
          if (callback) callback(err || err2);
        });
      });
    });
  };

  fs$$1.lchmodSync = function (path$$1, mode) {
    var fd = fs$$1.openSync(path$$1, constants.O_WRONLY | constants.O_SYMLINK, mode); // prefer to return the chmod error, if one occurs,
    // but still try to close, and report closing errors if they occur.

    var threw = true;
    var ret;

    try {
      ret = fs$$1.fchmodSync(fd, mode);
      threw = false;
    } finally {
      if (threw) {
        try {
          fs$$1.closeSync(fd);
        } catch (er) {}
      } else {
        fs$$1.closeSync(fd);
      }
    }

    return ret;
  };
}

function patchLutimes(fs$$1) {
  if (constants.hasOwnProperty("O_SYMLINK")) {
    fs$$1.lutimes = function (path$$1, at, mt, cb) {
      fs$$1.open(path$$1, constants.O_SYMLINK, function (er, fd) {
        if (er) {
          if (cb) cb(er);
          return;
        }

        fs$$1.futimes(fd, at, mt, function (er) {
          fs$$1.close(fd, function (er2) {
            if (cb) cb(er || er2);
          });
        });
      });
    };

    fs$$1.lutimesSync = function (path$$1, at, mt) {
      var fd = fs$$1.openSync(path$$1, constants.O_SYMLINK);
      var ret;
      var threw = true;

      try {
        ret = fs$$1.futimesSync(fd, at, mt);
        threw = false;
      } finally {
        if (threw) {
          try {
            fs$$1.closeSync(fd);
          } catch (er) {}
        } else {
          fs$$1.closeSync(fd);
        }
      }

      return ret;
    };
  } else {
    fs$$1.lutimes = function (_a, _b, _c, cb) {
      if (cb) process.nextTick(cb);
    };

    fs$$1.lutimesSync = function () {};
  }
}

function chmodFix(orig) {
  if (!orig) return orig;
  return function (target, mode, cb) {
    return orig.call(fs_1, target, mode, function (er) {
      if (chownErOk(er)) er = null;
      if (cb) cb.apply(this, arguments);
    });
  };
}

function chmodFixSync(orig) {
  if (!orig) return orig;
  return function (target, mode) {
    try {
      return orig.call(fs_1, target, mode);
    } catch (er) {
      if (!chownErOk(er)) throw er;
    }
  };
}

function chownFix(orig) {
  if (!orig) return orig;
  return function (target, uid, gid, cb) {
    return orig.call(fs_1, target, uid, gid, function (er) {
      if (chownErOk(er)) er = null;
      if (cb) cb.apply(this, arguments);
    });
  };
}

function chownFixSync(orig) {
  if (!orig) return orig;
  return function (target, uid, gid) {
    try {
      return orig.call(fs_1, target, uid, gid);
    } catch (er) {
      if (!chownErOk(er)) throw er;
    }
  };
}

function statFix(orig) {
  if (!orig) return orig; // Older versions of Node erroneously returned signed integers for
  // uid + gid.

  return function (target, cb) {
    return orig.call(fs_1, target, function (er, stats) {
      if (!stats) return cb.apply(this, arguments);
      if (stats.uid < 0) stats.uid += 0x100000000;
      if (stats.gid < 0) stats.gid += 0x100000000;
      if (cb) cb.apply(this, arguments);
    });
  };
}

function statFixSync(orig) {
  if (!orig) return orig; // Older versions of Node erroneously returned signed integers for
  // uid + gid.

  return function (target) {
    var stats = orig.call(fs_1, target);
    if (stats.uid < 0) stats.uid += 0x100000000;
    if (stats.gid < 0) stats.gid += 0x100000000;
    return stats;
  };
} // ENOSYS means that the fs doesn't support the op. Just ignore
// that, because it doesn't matter.
//
// if there's no getuid, or if getuid() is something other
// than 0, and the error is EINVAL or EPERM, then just ignore
// it.
//
// This specific case is a silent failure in cp, install, tar,
// and most other unix tools that manage permissions.
//
// When running as root, or if other types of errors are
// encountered, then it's strict.


function chownErOk(er) {
  if (!er) return true;
  if (er.code === "ENOSYS") return true;
  var nonroot = !process.getuid || process.getuid() !== 0;

  if (nonroot) {
    if (er.code === "EINVAL" || er.code === "EPERM") return true;
  }

  return false;
}

var Stream = stream.Stream;
var legacyStreams = legacy;

function legacy(fs$$1) {
  return {
    ReadStream: ReadStream,
    WriteStream: WriteStream
  };

  function ReadStream(path$$1, options) {
    if (!(this instanceof ReadStream)) return new ReadStream(path$$1, options);
    Stream.call(this);
    var self = this;
    this.path = path$$1;
    this.fd = null;
    this.readable = true;
    this.paused = false;
    this.flags = 'r';
    this.mode = 438;
    /*=0666*/

    this.bufferSize = 64 * 1024;
    options = options || {}; // Mixin options into this

    var keys = Object.keys(options);

    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.encoding) this.setEncoding(this.encoding);

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }

      if (this.end === undefined) {
        this.end = Infinity;
      } else if ('number' !== typeof this.end) {
        throw TypeError('end must be a Number');
      }

      if (this.start > this.end) {
        throw new Error('start must be <= end');
      }

      this.pos = this.start;
    }

    if (this.fd !== null) {
      process.nextTick(function () {
        self._read();
      });
      return;
    }

    fs$$1.open(this.path, this.flags, this.mode, function (err, fd) {
      if (err) {
        self.emit('error', err);
        self.readable = false;
        return;
      }

      self.fd = fd;
      self.emit('open', fd);

      self._read();
    });
  }

  function WriteStream(path$$1, options) {
    if (!(this instanceof WriteStream)) return new WriteStream(path$$1, options);
    Stream.call(this);
    this.path = path$$1;
    this.fd = null;
    this.writable = true;
    this.flags = 'w';
    this.encoding = 'binary';
    this.mode = 438;
    /*=0666*/

    this.bytesWritten = 0;
    options = options || {}; // Mixin options into this

    var keys = Object.keys(options);

    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }

      if (this.start < 0) {
        throw new Error('start must be >= zero');
      }

      this.pos = this.start;
    }

    this.busy = false;
    this._queue = [];

    if (this.fd === null) {
      this._open = fs$$1.open;

      this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);

      this.flush();
    }
  }
}

var gracefulFs = createCommonjsModule(function (module) {
  var queue = [];

  function noop() {}

  var debug = noop;
  if (util.debuglog) debug = util.debuglog('gfs4');else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) debug = function () {
    var m = util.format.apply(util, arguments);
    m = 'GFS4: ' + m.split(/\n/).join('\nGFS4: ');
    console.error(m);
  };

  if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
    process.on('exit', function () {
      debug(queue);
      assert.equal(queue.length, 0);
    });
  }

  module.exports = patch(fs_1);

  if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH) {
    module.exports = patch(fs);
  } // Always patch fs.close/closeSync, because we want to
  // retry() whenever a close happens *anywhere* in the program.
  // This is essential when multiple graceful-fs instances are
  // in play at the same time.


  module.exports.close = fs.close = function (fs$close) {
    return function (fd, cb) {
      return fs$close.call(fs, fd, function (err) {
        if (!err) retry();
        if (typeof cb === 'function') cb.apply(this, arguments);
      });
    };
  }(fs.close);

  module.exports.closeSync = fs.closeSync = function (fs$closeSync) {
    return function (fd) {
      // Note that graceful-fs also retries when fs.closeSync() fails.
      // Looks like a bug to me, although it's probably a harmless one.
      var rval = fs$closeSync.apply(fs, arguments);
      retry();
      return rval;
    };
  }(fs.closeSync);

  function patch(fs$$1) {
    // Everything that references the open() function needs to be in here
    polyfills(fs$$1);
    fs$$1.gracefulify = patch;
    fs$$1.FileReadStream = ReadStream; // Legacy name.

    fs$$1.FileWriteStream = WriteStream; // Legacy name.

    fs$$1.createReadStream = createReadStream;
    fs$$1.createWriteStream = createWriteStream;
    var fs$readFile = fs$$1.readFile;
    fs$$1.readFile = readFile;

    function readFile(path$$1, options, cb) {
      if (typeof options === 'function') cb = options, options = null;
      return go$readFile(path$$1, options, cb);

      function go$readFile(path$$1, options, cb) {
        return fs$readFile(path$$1, options, function (err) {
          if (err && (err.code === 'EMFILE' || err.code === 'ENFILE')) enqueue([go$readFile, [path$$1, options, cb]]);else {
            if (typeof cb === 'function') cb.apply(this, arguments);
            retry();
          }
        });
      }
    }

    var fs$writeFile = fs$$1.writeFile;
    fs$$1.writeFile = writeFile;

    function writeFile(path$$1, data, options, cb) {
      if (typeof options === 'function') cb = options, options = null;
      return go$writeFile(path$$1, data, options, cb);

      function go$writeFile(path$$1, data, options, cb) {
        return fs$writeFile(path$$1, data, options, function (err) {
          if (err && (err.code === 'EMFILE' || err.code === 'ENFILE')) enqueue([go$writeFile, [path$$1, data, options, cb]]);else {
            if (typeof cb === 'function') cb.apply(this, arguments);
            retry();
          }
        });
      }
    }

    var fs$appendFile = fs$$1.appendFile;
    if (fs$appendFile) fs$$1.appendFile = appendFile;

    function appendFile(path$$1, data, options, cb) {
      if (typeof options === 'function') cb = options, options = null;
      return go$appendFile(path$$1, data, options, cb);

      function go$appendFile(path$$1, data, options, cb) {
        return fs$appendFile(path$$1, data, options, function (err) {
          if (err && (err.code === 'EMFILE' || err.code === 'ENFILE')) enqueue([go$appendFile, [path$$1, data, options, cb]]);else {
            if (typeof cb === 'function') cb.apply(this, arguments);
            retry();
          }
        });
      }
    }

    var fs$readdir = fs$$1.readdir;
    fs$$1.readdir = readdir;

    function readdir(path$$1, options, cb) {
      var args = [path$$1];

      if (typeof options !== 'function') {
        args.push(options);
      } else {
        cb = options;
      }

      args.push(go$readdir$cb);
      return go$readdir(args);

      function go$readdir$cb(err, files) {
        if (files && files.sort) files.sort();
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE')) enqueue([go$readdir, [args]]);else {
          if (typeof cb === 'function') cb.apply(this, arguments);
          retry();
        }
      }
    }

    function go$readdir(args) {
      return fs$readdir.apply(fs$$1, args);
    }

    if (process.version.substr(0, 4) === 'v0.8') {
      var legStreams = legacyStreams(fs$$1);
      ReadStream = legStreams.ReadStream;
      WriteStream = legStreams.WriteStream;
    }

    var fs$ReadStream = fs$$1.ReadStream;
    ReadStream.prototype = Object.create(fs$ReadStream.prototype);
    ReadStream.prototype.open = ReadStream$open;
    var fs$WriteStream = fs$$1.WriteStream;
    WriteStream.prototype = Object.create(fs$WriteStream.prototype);
    WriteStream.prototype.open = WriteStream$open;
    fs$$1.ReadStream = ReadStream;
    fs$$1.WriteStream = WriteStream;

    function ReadStream(path$$1, options) {
      if (this instanceof ReadStream) return fs$ReadStream.apply(this, arguments), this;else return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
    }

    function ReadStream$open() {
      var that = this;
      open(that.path, that.flags, that.mode, function (err, fd) {
        if (err) {
          if (that.autoClose) that.destroy();
          that.emit('error', err);
        } else {
          that.fd = fd;
          that.emit('open', fd);
          that.read();
        }
      });
    }

    function WriteStream(path$$1, options) {
      if (this instanceof WriteStream) return fs$WriteStream.apply(this, arguments), this;else return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
    }

    function WriteStream$open() {
      var that = this;
      open(that.path, that.flags, that.mode, function (err, fd) {
        if (err) {
          that.destroy();
          that.emit('error', err);
        } else {
          that.fd = fd;
          that.emit('open', fd);
        }
      });
    }

    function createReadStream(path$$1, options) {
      return new ReadStream(path$$1, options);
    }

    function createWriteStream(path$$1, options) {
      return new WriteStream(path$$1, options);
    }

    var fs$open = fs$$1.open;
    fs$$1.open = open;

    function open(path$$1, flags, mode, cb) {
      if (typeof mode === 'function') cb = mode, mode = null;
      return go$open(path$$1, flags, mode, cb);

      function go$open(path$$1, flags, mode, cb) {
        return fs$open(path$$1, flags, mode, function (err, fd) {
          if (err && (err.code === 'EMFILE' || err.code === 'ENFILE')) enqueue([go$open, [path$$1, flags, mode, cb]]);else {
            if (typeof cb === 'function') cb.apply(this, arguments);
            retry();
          }
        });
      }
    }

    return fs$$1;
  }

  function enqueue(elem) {
    debug('ENQUEUE', elem[0].name, elem[1]);
    queue.push(elem);
  }

  function retry() {
    var elem = queue.shift();

    if (elem) {
      debug('RETRY', elem[0].name, elem[1]);
      elem[0].apply(null, elem[1]);
    }
  }
});
var gracefulFs_1 = gracefulFs.close;
var gracefulFs_2 = gracefulFs.closeSync;

var fs_1$1 = createCommonjsModule(function (module, exports) {
  // Copyright (c) 2014-2016 Jonathan Ong me@jongleberry.com and Contributors

  const u = universalify.fromCallback;
  const api = ['access', 'appendFile', 'chmod', 'chown', 'close', 'copyFile', 'fchmod', 'fchown', 'fdatasync', 'fstat', 'fsync', 'ftruncate', 'futimes', 'lchown', 'lchmod', 'link', 'lstat', 'mkdir', 'mkdtemp', 'open', 'readFile', 'readdir', 'readlink', 'realpath', 'rename', 'rmdir', 'stat', 'symlink', 'truncate', 'unlink', 'utimes', 'writeFile'].filter(key => {
    // Some commands are not available on some systems. Ex:
    // fs.copyFile was added in Node.js v8.5.0
    // fs.mkdtemp was added in Node.js v5.10.0
    // fs.lchown is not available on at least some Linux
    return typeof gracefulFs[key] === 'function';
  }); // Export all keys:

  Object.keys(gracefulFs).forEach(key => {
    if (key === 'promises') {
      // fs.promises is a getter property that triggers ExperimentalWarning
      // Don't re-export it here, the getter is defined in "lib/index.js"
      return;
    }

    exports[key] = gracefulFs[key];
  }); // Universalify async methods:

  api.forEach(method => {
    exports[method] = u(gracefulFs[method]);
  }); // We differ from mz/fs in that we still ship the old, broken, fs.exists()
  // since we are a drop-in replacement for the native module

  exports.exists = function (filename, callback) {
    if (typeof callback === 'function') {
      return gracefulFs.exists(filename, callback);
    }

    return new Promise(resolve => {
      return gracefulFs.exists(filename, resolve);
    });
  }; // fs.read() & fs.write need special treatment due to multiple callback args


  exports.read = function (fd, buffer, offset, length, position, callback) {
    if (typeof callback === 'function') {
      return gracefulFs.read(fd, buffer, offset, length, position, callback);
    }

    return new Promise((resolve, reject) => {
      gracefulFs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
        if (err) return reject(err);
        resolve({
          bytesRead,
          buffer
        });
      });
    });
  }; // Function signature can be
  // fs.write(fd, buffer[, offset[, length[, position]]], callback)
  // OR
  // fs.write(fd, string[, position[, encoding]], callback)
  // We need to handle both cases, so we use ...args


  exports.write = function (fd, buffer, ...args) {
    if (typeof args[args.length - 1] === 'function') {
      return gracefulFs.write.apply(gracefulFs, [fd, buffer].concat(args));
    }

    return new Promise((resolve, reject) => {
      gracefulFs.write.apply(gracefulFs, [fd, buffer].concat(args, [(err, bytesWritten, buffer) => {
        if (err) return reject(err);
        resolve({
          bytesWritten,
          buffer
        });
      }]));
    });
  };
});
var fs_2 = fs_1$1.exists;
var fs_3 = fs_1$1.read;
var fs_4 = fs_1$1.write;

var _library = false;

var _shared = createCommonjsModule(function (module) {
  var SHARED = '__core-js_shared__';
  var store = _global[SHARED] || (_global[SHARED] = {});
  (module.exports = function (key, value) {
    return store[key] || (store[key] = value !== undefined ? value : {});
  })('versions', []).push({
    version: _core.version,
    mode: 'global',
    copyright: '© 2018 Denis Pushkarev (zloirock.ru)'
  });
});

var _wks = createCommonjsModule(function (module) {
  var store = _shared('wks');
  var Symbol = _global.Symbol;
  var USE_SYMBOL = typeof Symbol == 'function';

  var $exports = module.exports = function (name) {
    return store[name] || (store[name] = USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : _uid)('Symbol.' + name));
  };

  $exports.store = store;
});

var f$1 = _wks;
var _wksExt = {
  f: f$1
};

var defineProperty = _objectDp.f;

var _wksDefine = function (name) {
  var $Symbol = _core.Symbol || (_core.Symbol = _library ? {} : _global.Symbol || {});
  if (name.charAt(0) != '_' && !(name in $Symbol)) defineProperty($Symbol, name, {
    value: _wksExt.f(name)
  });
};

_wksDefine('asyncIterator');

function getRootPath(p) {
  p = path.normalize(path.resolve(p)).split(path.sep);
  if (p.length > 0) return p[0];
  return null;
} // http://stackoverflow.com/a/62888/10333 contains more accurate
// TODO: expand to include the rest


const INVALID_PATH_CHARS = /[<>:"|?*]/;

function invalidWin32Path(p) {
  const rp = getRootPath(p);
  p = p.replace(rp, '');
  return INVALID_PATH_CHARS.test(p);
}

var win32 = {
  getRootPath,
  invalidWin32Path
};

const invalidWin32Path$1 = win32.invalidWin32Path;
const o777 = parseInt('0777', 8);

function mkdirs(p, opts, callback, made) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  } else if (!opts || typeof opts !== 'object') {
    opts = {
      mode: opts
    };
  }

  if (process.platform === 'win32' && invalidWin32Path$1(p)) {
    const errInval = new Error(p + ' contains invalid WIN32 path characters.');
    errInval.code = 'EINVAL';
    return callback(errInval);
  }

  let mode = opts.mode;
  const xfs = opts.fs || gracefulFs;

  if (mode === undefined) {
    mode = o777 & ~process.umask();
  }

  if (!made) made = null;

  callback = callback || function () {};

  p = path.resolve(p);
  xfs.mkdir(p, mode, er => {
    if (!er) {
      made = made || p;
      return callback(null, made);
    }

    switch (er.code) {
      case 'ENOENT':
        if (path.dirname(p) === p) return callback(er);
        mkdirs(path.dirname(p), opts, (er, made) => {
          if (er) callback(er, made);else mkdirs(p, opts, callback, made);
        });
        break;
      // In the case of any other error, just see if there's a dir
      // there already.  If so, then hooray!  If not, then something
      // is borked.

      default:
        xfs.stat(p, (er2, stat) => {
          // if the stat fails, then that's super weird.
          // let the original error be the failure reason.
          if (er2 || !stat.isDirectory()) callback(er, made);else callback(null, made);
        });
        break;
    }
  });
}

var mkdirs_1 = mkdirs;

const invalidWin32Path$2 = win32.invalidWin32Path;
const o777$1 = parseInt('0777', 8);

function mkdirsSync(p, opts, made) {
  if (!opts || typeof opts !== 'object') {
    opts = {
      mode: opts
    };
  }

  let mode = opts.mode;
  const xfs = opts.fs || gracefulFs;

  if (process.platform === 'win32' && invalidWin32Path$2(p)) {
    const errInval = new Error(p + ' contains invalid WIN32 path characters.');
    errInval.code = 'EINVAL';
    throw errInval;
  }

  if (mode === undefined) {
    mode = o777$1 & ~process.umask();
  }

  if (!made) made = null;
  p = path.resolve(p);

  try {
    xfs.mkdirSync(p, mode);
    made = made || p;
  } catch (err0) {
    if (err0.code === 'ENOENT') {
      if (path.dirname(p) === p) throw err0;
      made = mkdirsSync(path.dirname(p), opts, made);
      mkdirsSync(p, opts, made);
    } else {
      // In the case of any other error, just see if there's a dir there
      // already. If so, then hooray!  If not, then something is borked.
      let stat;

      try {
        stat = xfs.statSync(p);
      } catch (err1) {
        throw err0;
      }

      if (!stat.isDirectory()) throw err0;
    }
  }

  return made;
}

var mkdirsSync_1 = mkdirsSync;

const u = universalify.fromCallback;
const mkdirs$1 = u(mkdirs_1);
var mkdirs_1$1 = {
  mkdirs: mkdirs$1,
  mkdirsSync: mkdirsSync_1,
  // alias
  mkdirp: mkdirs$1,
  mkdirpSync: mkdirsSync_1,
  ensureDir: mkdirs$1,
  ensureDirSync: mkdirsSync_1
};

function hasMillisResSync() {
  let tmpfile = path.join('millis-test-sync' + Date.now().toString() + Math.random().toString().slice(2));
  tmpfile = path.join(os.tmpdir(), tmpfile); // 550 millis past UNIX epoch

  const d = new Date(1435410243862);
  gracefulFs.writeFileSync(tmpfile, 'https://github.com/jprichardson/node-fs-extra/pull/141');
  const fd = gracefulFs.openSync(tmpfile, 'r+');
  gracefulFs.futimesSync(fd, d, d);
  gracefulFs.closeSync(fd);
  return gracefulFs.statSync(tmpfile).mtime > 1435410243000;
}

function hasMillisRes(callback) {
  let tmpfile = path.join('millis-test' + Date.now().toString() + Math.random().toString().slice(2));
  tmpfile = path.join(os.tmpdir(), tmpfile); // 550 millis past UNIX epoch

  const d = new Date(1435410243862);
  gracefulFs.writeFile(tmpfile, 'https://github.com/jprichardson/node-fs-extra/pull/141', err => {
    if (err) return callback(err);
    gracefulFs.open(tmpfile, 'r+', (err, fd) => {
      if (err) return callback(err);
      gracefulFs.futimes(fd, d, d, err => {
        if (err) return callback(err);
        gracefulFs.close(fd, err => {
          if (err) return callback(err);
          gracefulFs.stat(tmpfile, (err, stats) => {
            if (err) return callback(err);
            callback(null, stats.mtime > 1435410243000);
          });
        });
      });
    });
  });
}

function timeRemoveMillis(timestamp) {
  if (typeof timestamp === 'number') {
    return Math.floor(timestamp / 1000) * 1000;
  } else if (timestamp instanceof Date) {
    return new Date(Math.floor(timestamp.getTime() / 1000) * 1000);
  } else {
    throw new Error('fs-extra: timeRemoveMillis() unknown parameter type');
  }
}

function utimesMillis(path$$1, atime, mtime, callback) {
  // if (!HAS_MILLIS_RES) return fs.utimes(path, atime, mtime, callback)
  gracefulFs.open(path$$1, 'r+', (err, fd) => {
    if (err) return callback(err);
    gracefulFs.futimes(fd, atime, mtime, futimesErr => {
      gracefulFs.close(fd, closeErr => {
        if (callback) callback(futimesErr || closeErr);
      });
    });
  });
}

function utimesMillisSync(path$$1, atime, mtime) {
  const fd = gracefulFs.openSync(path$$1, 'r+');
  gracefulFs.futimesSync(fd, atime, mtime);
  return gracefulFs.closeSync(fd);
}

var utimes = {
  hasMillisRes,
  hasMillisResSync,
  timeRemoveMillis,
  utimesMillis,
  utimesMillisSync
};

/* eslint-disable node/no-deprecated-api */

var buffer = function (size) {
  if (typeof Buffer.allocUnsafe === 'function') {
    try {
      return Buffer.allocUnsafe(size);
    } catch (e) {
      return new Buffer(size);
    }
  }

  return new Buffer(size);
};

const mkdirpSync = mkdirs_1$1.mkdirsSync;
const utimesSync = utimes.utimesMillisSync;
const notExist = Symbol('notExist');

function copySync(src, dest, opts) {
  if (typeof opts === 'function') {
    opts = {
      filter: opts
    };
  }

  opts = opts || {};
  opts.clobber = 'clobber' in opts ? !!opts.clobber : true; // default to true for now

  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber; // overwrite falls back to clobber
  // Warn about using preserveTimestamps on 32-bit node

  if (opts.preserveTimestamps && process.arch === 'ia32') {
    console.warn("fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;\n\n    see https://github.com/jprichardson/node-fs-extra/issues/269");
  }

  const destStat = checkPaths(src, dest);
  if (opts.filter && !opts.filter(src, dest)) return;
  const destParent = path.dirname(dest);
  if (!gracefulFs.existsSync(destParent)) mkdirpSync(destParent);
  return startCopy(destStat, src, dest, opts);
}

function startCopy(destStat, src, dest, opts) {
  if (opts.filter && !opts.filter(src, dest)) return;
  return getStats(destStat, src, dest, opts);
}

function getStats(destStat, src, dest, opts) {
  const statSync = opts.dereference ? gracefulFs.statSync : gracefulFs.lstatSync;
  const srcStat = statSync(src);
  if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts);else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts);else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts);
}

function onFile(srcStat, destStat, src, dest, opts) {
  if (destStat === notExist) return copyFile(srcStat, src, dest, opts);
  return mayCopyFile(srcStat, src, dest, opts);
}

function mayCopyFile(srcStat, src, dest, opts) {
  if (opts.overwrite) {
    gracefulFs.unlinkSync(dest);
    return copyFile(srcStat, src, dest, opts);
  } else if (opts.errorOnExist) {
    throw new Error("'".concat(dest, "' already exists"));
  }
}

function copyFile(srcStat, src, dest, opts) {
  if (typeof gracefulFs.copyFileSync === 'function') {
    gracefulFs.copyFileSync(src, dest);
    gracefulFs.chmodSync(dest, srcStat.mode);

    if (opts.preserveTimestamps) {
      return utimesSync(dest, srcStat.atime, srcStat.mtime);
    }

    return;
  }

  return copyFileFallback(srcStat, src, dest, opts);
}

function copyFileFallback(srcStat, src, dest, opts) {
  const BUF_LENGTH = 64 * 1024;

  const _buff = buffer(BUF_LENGTH);

  const fdr = gracefulFs.openSync(src, 'r');
  const fdw = gracefulFs.openSync(dest, 'w', srcStat.mode);
  let pos = 0;

  while (pos < srcStat.size) {
    const bytesRead = gracefulFs.readSync(fdr, _buff, 0, BUF_LENGTH, pos);
    gracefulFs.writeSync(fdw, _buff, 0, bytesRead);
    pos += bytesRead;
  }

  if (opts.preserveTimestamps) gracefulFs.futimesSync(fdw, srcStat.atime, srcStat.mtime);
  gracefulFs.closeSync(fdr);
  gracefulFs.closeSync(fdw);
}

function onDir(srcStat, destStat, src, dest, opts) {
  if (destStat === notExist) return mkDirAndCopy(srcStat, src, dest, opts);

  if (destStat && !destStat.isDirectory()) {
    throw new Error("Cannot overwrite non-directory '".concat(dest, "' with directory '").concat(src, "'."));
  }

  return copyDir(src, dest, opts);
}

function mkDirAndCopy(srcStat, src, dest, opts) {
  gracefulFs.mkdirSync(dest);
  copyDir(src, dest, opts);
  return gracefulFs.chmodSync(dest, srcStat.mode);
}

function copyDir(src, dest, opts) {
  gracefulFs.readdirSync(src).forEach(item => copyDirItem(item, src, dest, opts));
}

function copyDirItem(item, src, dest, opts) {
  const srcItem = path.join(src, item);
  const destItem = path.join(dest, item);
  const destStat = checkPaths(srcItem, destItem);
  return startCopy(destStat, srcItem, destItem, opts);
}

function onLink(destStat, src, dest, opts) {
  let resolvedSrc = gracefulFs.readlinkSync(src);

  if (opts.dereference) {
    resolvedSrc = path.resolve(process.cwd(), resolvedSrc);
  }

  if (destStat === notExist) {
    return gracefulFs.symlinkSync(resolvedSrc, dest);
  } else {
    let resolvedDest;

    try {
      resolvedDest = gracefulFs.readlinkSync(dest);
    } catch (err) {
      // dest exists and is a regular file or directory,
      // Windows may throw UNKNOWN error. If dest already exists,
      // fs throws error anyway, so no need to guard against it here.
      if (err.code === 'EINVAL' || err.code === 'UNKNOWN') return gracefulFs.symlinkSync(resolvedSrc, dest);
      throw err;
    }

    if (opts.dereference) {
      resolvedDest = path.resolve(process.cwd(), resolvedDest);
    }

    if (isSrcSubdir(resolvedSrc, resolvedDest)) {
      throw new Error("Cannot copy '".concat(resolvedSrc, "' to a subdirectory of itself, '").concat(resolvedDest, "'."));
    } // prevent copy if src is a subdir of dest since unlinking
    // dest in this case would result in removing src contents
    // and therefore a broken symlink would be created.


    if (gracefulFs.statSync(dest).isDirectory() && isSrcSubdir(resolvedDest, resolvedSrc)) {
      throw new Error("Cannot overwrite '".concat(resolvedDest, "' with '").concat(resolvedSrc, "'."));
    }

    return copyLink(resolvedSrc, dest);
  }
}

function copyLink(resolvedSrc, dest) {
  gracefulFs.unlinkSync(dest);
  return gracefulFs.symlinkSync(resolvedSrc, dest);
} // return true if dest is a subdir of src, otherwise false.


function isSrcSubdir(src, dest) {
  const srcArray = path.resolve(src).split(path.sep);
  const destArray = path.resolve(dest).split(path.sep);
  return srcArray.reduce((acc, current, i) => acc && destArray[i] === current, true);
}

function checkStats(src, dest) {
  const srcStat = gracefulFs.statSync(src);
  let destStat;

  try {
    destStat = gracefulFs.statSync(dest);
  } catch (err) {
    if (err.code === 'ENOENT') return {
      srcStat,
      destStat: notExist
    };
    throw err;
  }

  return {
    srcStat,
    destStat
  };
}

function checkPaths(src, dest) {
  const {
    srcStat,
    destStat
  } = checkStats(src, dest);

  if (destStat.ino && destStat.ino === srcStat.ino) {
    throw new Error('Source and destination must not be the same.');
  }

  if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
    throw new Error("Cannot copy '".concat(src, "' to a subdirectory of itself, '").concat(dest, "'."));
  }

  return destStat;
}

var copySync_1 = copySync;

var copySync$1 = {
  copySync: copySync_1
};

const u$1 = universalify.fromPromise;

function pathExists(path$$1) {
  return fs_1$1.access(path$$1).then(() => true).catch(() => false);
}

var pathExists_1 = {
  pathExists: u$1(pathExists),
  pathExistsSync: fs_1$1.existsSync
};

const mkdirp$1 = mkdirs_1$1.mkdirs;
const pathExists$1 = pathExists_1.pathExists;
const utimes$1 = utimes.utimesMillis;
const notExist$1 = Symbol('notExist');

function copy(src, dest, opts, cb) {
  if (typeof opts === 'function' && !cb) {
    cb = opts;
    opts = {};
  } else if (typeof opts === 'function') {
    opts = {
      filter: opts
    };
  }

  cb = cb || function () {};

  opts = opts || {};
  opts.clobber = 'clobber' in opts ? !!opts.clobber : true; // default to true for now

  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber; // overwrite falls back to clobber
  // Warn about using preserveTimestamps on 32-bit node

  if (opts.preserveTimestamps && process.arch === 'ia32') {
    console.warn("fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;\n\n    see https://github.com/jprichardson/node-fs-extra/issues/269");
  }

  checkPaths$1(src, dest, (err, destStat) => {
    if (err) return cb(err);
    if (opts.filter) return handleFilter(checkParentDir, destStat, src, dest, opts, cb);
    return checkParentDir(destStat, src, dest, opts, cb);
  });
}

function checkParentDir(destStat, src, dest, opts, cb) {
  const destParent = path.dirname(dest);
  pathExists$1(destParent, (err, dirExists) => {
    if (err) return cb(err);
    if (dirExists) return startCopy$1(destStat, src, dest, opts, cb);
    mkdirp$1(destParent, err => {
      if (err) return cb(err);
      return startCopy$1(destStat, src, dest, opts, cb);
    });
  });
}

function handleFilter(onInclude, destStat, src, dest, opts, cb) {
  Promise.resolve(opts.filter(src, dest)).then(include => {
    if (include) {
      if (destStat) return onInclude(destStat, src, dest, opts, cb);
      return onInclude(src, dest, opts, cb);
    }

    return cb();
  }, error => cb(error));
}

function startCopy$1(destStat, src, dest, opts, cb) {
  if (opts.filter) return handleFilter(getStats$1, destStat, src, dest, opts, cb);
  return getStats$1(destStat, src, dest, opts, cb);
}

function getStats$1(destStat, src, dest, opts, cb) {
  const stat = opts.dereference ? gracefulFs.stat : gracefulFs.lstat;
  stat(src, (err, srcStat) => {
    if (err) return cb(err);
    if (srcStat.isDirectory()) return onDir$1(srcStat, destStat, src, dest, opts, cb);else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile$1(srcStat, destStat, src, dest, opts, cb);else if (srcStat.isSymbolicLink()) return onLink$1(destStat, src, dest, opts, cb);
  });
}

function onFile$1(srcStat, destStat, src, dest, opts, cb) {
  if (destStat === notExist$1) return copyFile$1(srcStat, src, dest, opts, cb);
  return mayCopyFile$1(srcStat, src, dest, opts, cb);
}

function mayCopyFile$1(srcStat, src, dest, opts, cb) {
  if (opts.overwrite) {
    gracefulFs.unlink(dest, err => {
      if (err) return cb(err);
      return copyFile$1(srcStat, src, dest, opts, cb);
    });
  } else if (opts.errorOnExist) {
    return cb(new Error("'".concat(dest, "' already exists")));
  } else return cb();
}

function copyFile$1(srcStat, src, dest, opts, cb) {
  if (typeof gracefulFs.copyFile === 'function') {
    return gracefulFs.copyFile(src, dest, err => {
      if (err) return cb(err);
      return setDestModeAndTimestamps(srcStat, dest, opts, cb);
    });
  }

  return copyFileFallback$1(srcStat, src, dest, opts, cb);
}

function copyFileFallback$1(srcStat, src, dest, opts, cb) {
  const rs = gracefulFs.createReadStream(src);
  rs.on('error', err => cb(err)).once('open', () => {
    const ws = gracefulFs.createWriteStream(dest, {
      mode: srcStat.mode
    });
    ws.on('error', err => cb(err)).on('open', () => rs.pipe(ws)).once('close', () => setDestModeAndTimestamps(srcStat, dest, opts, cb));
  });
}

function setDestModeAndTimestamps(srcStat, dest, opts, cb) {
  gracefulFs.chmod(dest, srcStat.mode, err => {
    if (err) return cb(err);

    if (opts.preserveTimestamps) {
      return utimes$1(dest, srcStat.atime, srcStat.mtime, cb);
    }

    return cb();
  });
}

function onDir$1(srcStat, destStat, src, dest, opts, cb) {
  if (destStat === notExist$1) return mkDirAndCopy$1(srcStat, src, dest, opts, cb);

  if (destStat && !destStat.isDirectory()) {
    return cb(new Error("Cannot overwrite non-directory '".concat(dest, "' with directory '").concat(src, "'.")));
  }

  return copyDir$1(src, dest, opts, cb);
}

function mkDirAndCopy$1(srcStat, src, dest, opts, cb) {
  gracefulFs.mkdir(dest, err => {
    if (err) return cb(err);
    copyDir$1(src, dest, opts, err => {
      if (err) return cb(err);
      return gracefulFs.chmod(dest, srcStat.mode, cb);
    });
  });
}

function copyDir$1(src, dest, opts, cb) {
  gracefulFs.readdir(src, (err, items) => {
    if (err) return cb(err);
    return copyDirItems(items, src, dest, opts, cb);
  });
}

function copyDirItems(items, src, dest, opts, cb) {
  const item = items.pop();
  if (!item) return cb();
  return copyDirItem$1(items, item, src, dest, opts, cb);
}

function copyDirItem$1(items, item, src, dest, opts, cb) {
  const srcItem = path.join(src, item);
  const destItem = path.join(dest, item);
  checkPaths$1(srcItem, destItem, (err, destStat) => {
    if (err) return cb(err);
    startCopy$1(destStat, srcItem, destItem, opts, err => {
      if (err) return cb(err);
      return copyDirItems(items, src, dest, opts, cb);
    });
  });
}

function onLink$1(destStat, src, dest, opts, cb) {
  gracefulFs.readlink(src, (err, resolvedSrc) => {
    if (err) return cb(err);

    if (opts.dereference) {
      resolvedSrc = path.resolve(process.cwd(), resolvedSrc);
    }

    if (destStat === notExist$1) {
      return gracefulFs.symlink(resolvedSrc, dest, cb);
    } else {
      gracefulFs.readlink(dest, (err, resolvedDest) => {
        if (err) {
          // dest exists and is a regular file or directory,
          // Windows may throw UNKNOWN error. If dest already exists,
          // fs throws error anyway, so no need to guard against it here.
          if (err.code === 'EINVAL' || err.code === 'UNKNOWN') return gracefulFs.symlink(resolvedSrc, dest, cb);
          return cb(err);
        }

        if (opts.dereference) {
          resolvedDest = path.resolve(process.cwd(), resolvedDest);
        }

        if (isSrcSubdir$1(resolvedSrc, resolvedDest)) {
          return cb(new Error("Cannot copy '".concat(resolvedSrc, "' to a subdirectory of itself, '").concat(resolvedDest, "'.")));
        } // do not copy if src is a subdir of dest since unlinking
        // dest in this case would result in removing src contents
        // and therefore a broken symlink would be created.


        if (destStat.isDirectory() && isSrcSubdir$1(resolvedDest, resolvedSrc)) {
          return cb(new Error("Cannot overwrite '".concat(resolvedDest, "' with '").concat(resolvedSrc, "'.")));
        }

        return copyLink$1(resolvedSrc, dest, cb);
      });
    }
  });
}

function copyLink$1(resolvedSrc, dest, cb) {
  gracefulFs.unlink(dest, err => {
    if (err) return cb(err);
    return gracefulFs.symlink(resolvedSrc, dest, cb);
  });
} // return true if dest is a subdir of src, otherwise false.


function isSrcSubdir$1(src, dest) {
  const srcArray = path.resolve(src).split(path.sep);
  const destArray = path.resolve(dest).split(path.sep);
  return srcArray.reduce((acc, current, i) => acc && destArray[i] === current, true);
}

function checkStats$1(src, dest, cb) {
  gracefulFs.stat(src, (err, srcStat) => {
    if (err) return cb(err);
    gracefulFs.stat(dest, (err, destStat) => {
      if (err) {
        if (err.code === 'ENOENT') return cb(null, {
          srcStat,
          destStat: notExist$1
        });
        return cb(err);
      }

      return cb(null, {
        srcStat,
        destStat
      });
    });
  });
}

function checkPaths$1(src, dest, cb) {
  checkStats$1(src, dest, (err, stats) => {
    if (err) return cb(err);
    const {
      srcStat,
      destStat
    } = stats;

    if (destStat.ino && destStat.ino === srcStat.ino) {
      return cb(new Error('Source and destination must not be the same.'));
    }

    if (srcStat.isDirectory() && isSrcSubdir$1(src, dest)) {
      return cb(new Error("Cannot copy '".concat(src, "' to a subdirectory of itself, '").concat(dest, "'.")));
    }

    return cb(null, destStat);
  });
}

var copy_1 = copy;

const u$2 = universalify.fromCallback;
var copy$1 = {
  copy: u$2(copy_1)
};

const isWindows = process.platform === 'win32';

function defaults(options) {
  const methods = ['unlink', 'chmod', 'stat', 'lstat', 'rmdir', 'readdir'];
  methods.forEach(m => {
    options[m] = options[m] || gracefulFs[m];
    m = m + 'Sync';
    options[m] = options[m] || gracefulFs[m];
  });
  options.maxBusyTries = options.maxBusyTries || 3;
}

function rimraf(p, options, cb) {
  let busyTries = 0;

  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  assert(p, 'rimraf: missing path');
  assert.strictEqual(typeof p, 'string', 'rimraf: path should be a string');
  assert.strictEqual(typeof cb, 'function', 'rimraf: callback function required');
  assert(options, 'rimraf: invalid options argument provided');
  assert.strictEqual(typeof options, 'object', 'rimraf: options should be object');
  defaults(options);
  rimraf_(p, options, function CB(er) {
    if (er) {
      if ((er.code === 'EBUSY' || er.code === 'ENOTEMPTY' || er.code === 'EPERM') && busyTries < options.maxBusyTries) {
        busyTries++;
        const time = busyTries * 100; // try again, with the same exact callback as this one.

        return setTimeout(() => rimraf_(p, options, CB), time);
      } // already gone


      if (er.code === 'ENOENT') er = null;
    }

    cb(er);
  });
} // Two possible strategies.
// 1. Assume it's a file.  unlink it, then do the dir stuff on EPERM or EISDIR
// 2. Assume it's a directory.  readdir, then do the file stuff on ENOTDIR
//
// Both result in an extra syscall when you guess wrong.  However, there
// are likely far more normal files in the world than directories.  This
// is based on the assumption that a the average number of files per
// directory is >= 1.
//
// If anyone ever complains about this, then I guess the strategy could
// be made configurable somehow.  But until then, YAGNI.


function rimraf_(p, options, cb) {
  assert(p);
  assert(options);
  assert(typeof cb === 'function'); // sunos lets the root user unlink directories, which is... weird.
  // so we have to lstat here and make sure it's not a dir.

  options.lstat(p, (er, st) => {
    if (er && er.code === 'ENOENT') {
      return cb(null);
    } // Windows can EPERM on stat.  Life is suffering.


    if (er && er.code === 'EPERM' && isWindows) {
      return fixWinEPERM(p, options, er, cb);
    }

    if (st && st.isDirectory()) {
      return rmdir(p, options, er, cb);
    }

    options.unlink(p, er => {
      if (er) {
        if (er.code === 'ENOENT') {
          return cb(null);
        }

        if (er.code === 'EPERM') {
          return isWindows ? fixWinEPERM(p, options, er, cb) : rmdir(p, options, er, cb);
        }

        if (er.code === 'EISDIR') {
          return rmdir(p, options, er, cb);
        }
      }

      return cb(er);
    });
  });
}

function fixWinEPERM(p, options, er, cb) {
  assert(p);
  assert(options);
  assert(typeof cb === 'function');

  if (er) {
    assert(er instanceof Error);
  }

  options.chmod(p, 0o666, er2 => {
    if (er2) {
      cb(er2.code === 'ENOENT' ? null : er);
    } else {
      options.stat(p, (er3, stats) => {
        if (er3) {
          cb(er3.code === 'ENOENT' ? null : er);
        } else if (stats.isDirectory()) {
          rmdir(p, options, er, cb);
        } else {
          options.unlink(p, cb);
        }
      });
    }
  });
}

function fixWinEPERMSync(p, options, er) {
  let stats;
  assert(p);
  assert(options);

  if (er) {
    assert(er instanceof Error);
  }

  try {
    options.chmodSync(p, 0o666);
  } catch (er2) {
    if (er2.code === 'ENOENT') {
      return;
    } else {
      throw er;
    }
  }

  try {
    stats = options.statSync(p);
  } catch (er3) {
    if (er3.code === 'ENOENT') {
      return;
    } else {
      throw er;
    }
  }

  if (stats.isDirectory()) {
    rmdirSync(p, options, er);
  } else {
    options.unlinkSync(p);
  }
}

function rmdir(p, options, originalEr, cb) {
  assert(p);
  assert(options);

  if (originalEr) {
    assert(originalEr instanceof Error);
  }

  assert(typeof cb === 'function'); // try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
  // if we guessed wrong, and it's not a directory, then
  // raise the original error.

  options.rmdir(p, er => {
    if (er && (er.code === 'ENOTEMPTY' || er.code === 'EEXIST' || er.code === 'EPERM')) {
      rmkids(p, options, cb);
    } else if (er && er.code === 'ENOTDIR') {
      cb(originalEr);
    } else {
      cb(er);
    }
  });
}

function rmkids(p, options, cb) {
  assert(p);
  assert(options);
  assert(typeof cb === 'function');
  options.readdir(p, (er, files) => {
    if (er) return cb(er);
    let n = files.length;
    let errState;
    if (n === 0) return options.rmdir(p, cb);
    files.forEach(f => {
      rimraf(path.join(p, f), options, er => {
        if (errState) {
          return;
        }

        if (er) return cb(errState = er);

        if (--n === 0) {
          options.rmdir(p, cb);
        }
      });
    });
  });
} // this looks simpler, and is strictly *faster*, but will
// tie up the JavaScript thread and fail on excessively
// deep directory trees.


function rimrafSync(p, options) {
  let st;
  options = options || {};
  defaults(options);
  assert(p, 'rimraf: missing path');
  assert.strictEqual(typeof p, 'string', 'rimraf: path should be a string');
  assert(options, 'rimraf: missing options');
  assert.strictEqual(typeof options, 'object', 'rimraf: options should be object');

  try {
    st = options.lstatSync(p);
  } catch (er) {
    if (er.code === 'ENOENT') {
      return;
    } // Windows can EPERM on stat.  Life is suffering.


    if (er.code === 'EPERM' && isWindows) {
      fixWinEPERMSync(p, options, er);
    }
  }

  try {
    // sunos lets the root user unlink directories, which is... weird.
    if (st && st.isDirectory()) {
      rmdirSync(p, options, null);
    } else {
      options.unlinkSync(p);
    }
  } catch (er) {
    if (er.code === 'ENOENT') {
      return;
    } else if (er.code === 'EPERM') {
      return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er);
    } else if (er.code !== 'EISDIR') {
      throw er;
    }

    rmdirSync(p, options, er);
  }
}

function rmdirSync(p, options, originalEr) {
  assert(p);
  assert(options);

  if (originalEr) {
    assert(originalEr instanceof Error);
  }

  try {
    options.rmdirSync(p);
  } catch (er) {
    if (er.code === 'ENOTDIR') {
      throw originalEr;
    } else if (er.code === 'ENOTEMPTY' || er.code === 'EEXIST' || er.code === 'EPERM') {
      rmkidsSync(p, options);
    } else if (er.code !== 'ENOENT') {
      throw er;
    }
  }
}

function rmkidsSync(p, options) {
  assert(p);
  assert(options);
  options.readdirSync(p).forEach(f => rimrafSync(path.join(p, f), options)); // We only end up here once we got ENOTEMPTY at least once, and
  // at this point, we are guaranteed to have removed all the kids.
  // So, we know that it won't be ENOENT or ENOTDIR or anything else.
  // try really hard to delete stuff on windows, because it has a
  // PROFOUNDLY annoying habit of not closing handles promptly when
  // files are deleted, resulting in spurious ENOTEMPTY errors.

  const retries = isWindows ? 100 : 1;
  let i = 0;

  do {
    let threw = true;

    try {
      const ret = options.rmdirSync(p, options);
      threw = false;
      return ret;
    } finally {
      if (++i < retries && threw) continue; // eslint-disable-line
    }
  } while (true);
}

var rimraf_1 = rimraf;
rimraf.sync = rimrafSync;

const u$3 = universalify.fromCallback;
var remove = {
  remove: u$3(rimraf_1),
  removeSync: rimraf_1.sync
};

const u$4 = universalify.fromCallback;
const emptyDir = u$4(function emptyDir(dir, callback) {
  callback = callback || function () {};

  fs.readdir(dir, (err, items) => {
    if (err) return mkdirs_1$1.mkdirs(dir, callback);
    items = items.map(item => path.join(dir, item));
    deleteItem();

    function deleteItem() {
      const item = items.pop();
      if (!item) return callback();
      remove.remove(item, err => {
        if (err) return callback(err);
        deleteItem();
      });
    }
  });
});

function emptyDirSync(dir) {
  let items;

  try {
    items = fs.readdirSync(dir);
  } catch (err) {
    return mkdirs_1$1.mkdirsSync(dir);
  }

  items.forEach(item => {
    item = path.join(dir, item);
    remove.removeSync(item);
  });
}

var empty = {
  emptyDirSync,
  emptydirSync: emptyDirSync,
  emptyDir,
  emptydir: emptyDir
};

const u$5 = universalify.fromCallback;
const pathExists$2 = pathExists_1.pathExists;

function createFile(file, callback) {
  function makeFile() {
    gracefulFs.writeFile(file, '', err => {
      if (err) return callback(err);
      callback();
    });
  }

  gracefulFs.stat(file, (err, stats) => {
    // eslint-disable-line handle-callback-err
    if (!err && stats.isFile()) return callback();
    const dir = path.dirname(file);
    pathExists$2(dir, (err, dirExists) => {
      if (err) return callback(err);
      if (dirExists) return makeFile();
      mkdirs_1$1.mkdirs(dir, err => {
        if (err) return callback(err);
        makeFile();
      });
    });
  });
}

function createFileSync(file) {
  let stats;

  try {
    stats = gracefulFs.statSync(file);
  } catch (e) {}

  if (stats && stats.isFile()) return;
  const dir = path.dirname(file);

  if (!gracefulFs.existsSync(dir)) {
    mkdirs_1$1.mkdirsSync(dir);
  }

  gracefulFs.writeFileSync(file, '');
}

var file = {
  createFile: u$5(createFile),
  createFileSync
};

const u$6 = universalify.fromCallback;
const pathExists$3 = pathExists_1.pathExists;

function createLink(srcpath, dstpath, callback) {
  function makeLink(srcpath, dstpath) {
    gracefulFs.link(srcpath, dstpath, err => {
      if (err) return callback(err);
      callback(null);
    });
  }

  pathExists$3(dstpath, (err, destinationExists) => {
    if (err) return callback(err);
    if (destinationExists) return callback(null);
    gracefulFs.lstat(srcpath, err => {
      if (err) {
        err.message = err.message.replace('lstat', 'ensureLink');
        return callback(err);
      }

      const dir = path.dirname(dstpath);
      pathExists$3(dir, (err, dirExists) => {
        if (err) return callback(err);
        if (dirExists) return makeLink(srcpath, dstpath);
        mkdirs_1$1.mkdirs(dir, err => {
          if (err) return callback(err);
          makeLink(srcpath, dstpath);
        });
      });
    });
  });
}

function createLinkSync(srcpath, dstpath) {
  const destinationExists = gracefulFs.existsSync(dstpath);
  if (destinationExists) return undefined;

  try {
    gracefulFs.lstatSync(srcpath);
  } catch (err) {
    err.message = err.message.replace('lstat', 'ensureLink');
    throw err;
  }

  const dir = path.dirname(dstpath);
  const dirExists = gracefulFs.existsSync(dir);
  if (dirExists) return gracefulFs.linkSync(srcpath, dstpath);
  mkdirs_1$1.mkdirsSync(dir);
  return gracefulFs.linkSync(srcpath, dstpath);
}

var link = {
  createLink: u$6(createLink),
  createLinkSync
};

const pathExists$4 = pathExists_1.pathExists;
/**
 * Function that returns two types of paths, one relative to symlink, and one
 * relative to the current working directory. Checks if path is absolute or
 * relative. If the path is relative, this function checks if the path is
 * relative to symlink or relative to current working directory. This is an
 * initiative to find a smarter `srcpath` to supply when building symlinks.
 * This allows you to determine which path to use out of one of three possible
 * types of source paths. The first is an absolute path. This is detected by
 * `path.isAbsolute()`. When an absolute path is provided, it is checked to
 * see if it exists. If it does it's used, if not an error is returned
 * (callback)/ thrown (sync). The other two options for `srcpath` are a
 * relative url. By default Node's `fs.symlink` works by creating a symlink
 * using `dstpath` and expects the `srcpath` to be relative to the newly
 * created symlink. If you provide a `srcpath` that does not exist on the file
 * system it results in a broken symlink. To minimize this, the function
 * checks to see if the 'relative to symlink' source file exists, and if it
 * does it will use it. If it does not, it checks if there's a file that
 * exists that is relative to the current working directory, if does its used.
 * This preserves the expectations of the original fs.symlink spec and adds
 * the ability to pass in `relative to current working direcotry` paths.
 */

function symlinkPaths(srcpath, dstpath, callback) {
  if (path.isAbsolute(srcpath)) {
    return gracefulFs.lstat(srcpath, err => {
      if (err) {
        err.message = err.message.replace('lstat', 'ensureSymlink');
        return callback(err);
      }

      return callback(null, {
        'toCwd': srcpath,
        'toDst': srcpath
      });
    });
  } else {
    const dstdir = path.dirname(dstpath);
    const relativeToDst = path.join(dstdir, srcpath);
    return pathExists$4(relativeToDst, (err, exists) => {
      if (err) return callback(err);

      if (exists) {
        return callback(null, {
          'toCwd': relativeToDst,
          'toDst': srcpath
        });
      } else {
        return gracefulFs.lstat(srcpath, err => {
          if (err) {
            err.message = err.message.replace('lstat', 'ensureSymlink');
            return callback(err);
          }

          return callback(null, {
            'toCwd': srcpath,
            'toDst': path.relative(dstdir, srcpath)
          });
        });
      }
    });
  }
}

function symlinkPathsSync(srcpath, dstpath) {
  let exists;

  if (path.isAbsolute(srcpath)) {
    exists = gracefulFs.existsSync(srcpath);
    if (!exists) throw new Error('absolute srcpath does not exist');
    return {
      'toCwd': srcpath,
      'toDst': srcpath
    };
  } else {
    const dstdir = path.dirname(dstpath);
    const relativeToDst = path.join(dstdir, srcpath);
    exists = gracefulFs.existsSync(relativeToDst);

    if (exists) {
      return {
        'toCwd': relativeToDst,
        'toDst': srcpath
      };
    } else {
      exists = gracefulFs.existsSync(srcpath);
      if (!exists) throw new Error('relative srcpath does not exist');
      return {
        'toCwd': srcpath,
        'toDst': path.relative(dstdir, srcpath)
      };
    }
  }
}

var symlinkPaths_1 = {
  symlinkPaths,
  symlinkPathsSync
};

function symlinkType(srcpath, type, callback) {
  callback = typeof type === 'function' ? type : callback;
  type = typeof type === 'function' ? false : type;
  if (type) return callback(null, type);
  gracefulFs.lstat(srcpath, (err, stats) => {
    if (err) return callback(null, 'file');
    type = stats && stats.isDirectory() ? 'dir' : 'file';
    callback(null, type);
  });
}

function symlinkTypeSync(srcpath, type) {
  let stats;
  if (type) return type;

  try {
    stats = gracefulFs.lstatSync(srcpath);
  } catch (e) {
    return 'file';
  }

  return stats && stats.isDirectory() ? 'dir' : 'file';
}

var symlinkType_1 = {
  symlinkType,
  symlinkTypeSync
};

const u$7 = universalify.fromCallback;
const mkdirs$2 = mkdirs_1$1.mkdirs;
const mkdirsSync$1 = mkdirs_1$1.mkdirsSync;
const symlinkPaths$1 = symlinkPaths_1.symlinkPaths;
const symlinkPathsSync$1 = symlinkPaths_1.symlinkPathsSync;
const symlinkType$1 = symlinkType_1.symlinkType;
const symlinkTypeSync$1 = symlinkType_1.symlinkTypeSync;
const pathExists$5 = pathExists_1.pathExists;

function createSymlink(srcpath, dstpath, type, callback) {
  callback = typeof type === 'function' ? type : callback;
  type = typeof type === 'function' ? false : type;
  pathExists$5(dstpath, (err, destinationExists) => {
    if (err) return callback(err);
    if (destinationExists) return callback(null);
    symlinkPaths$1(srcpath, dstpath, (err, relative) => {
      if (err) return callback(err);
      srcpath = relative.toDst;
      symlinkType$1(relative.toCwd, type, (err, type) => {
        if (err) return callback(err);
        const dir = path.dirname(dstpath);
        pathExists$5(dir, (err, dirExists) => {
          if (err) return callback(err);
          if (dirExists) return gracefulFs.symlink(srcpath, dstpath, type, callback);
          mkdirs$2(dir, err => {
            if (err) return callback(err);
            gracefulFs.symlink(srcpath, dstpath, type, callback);
          });
        });
      });
    });
  });
}

function createSymlinkSync(srcpath, dstpath, type) {
  const destinationExists = gracefulFs.existsSync(dstpath);
  if (destinationExists) return undefined;
  const relative = symlinkPathsSync$1(srcpath, dstpath);
  srcpath = relative.toDst;
  type = symlinkTypeSync$1(relative.toCwd, type);
  const dir = path.dirname(dstpath);
  const exists = gracefulFs.existsSync(dir);
  if (exists) return gracefulFs.symlinkSync(srcpath, dstpath, type);
  mkdirsSync$1(dir);
  return gracefulFs.symlinkSync(srcpath, dstpath, type);
}

var symlink = {
  createSymlink: u$7(createSymlink),
  createSymlinkSync
};

var ensure = {
  // file
  createFile: file.createFile,
  createFileSync: file.createFileSync,
  ensureFile: file.createFile,
  ensureFileSync: file.createFileSync,
  // link
  createLink: link.createLink,
  createLinkSync: link.createLinkSync,
  ensureLink: link.createLink,
  ensureLinkSync: link.createLinkSync,
  // symlink
  createSymlink: symlink.createSymlink,
  createSymlinkSync: symlink.createSymlinkSync,
  ensureSymlink: symlink.createSymlink,
  ensureSymlinkSync: symlink.createSymlinkSync
};

var _fs;

try {
  _fs = gracefulFs;
} catch (_) {
  _fs = fs;
}

function readFile(file, options, callback) {
  if (callback == null) {
    callback = options;
    options = {};
  }

  if (typeof options === 'string') {
    options = {
      encoding: options
    };
  }

  options = options || {};
  var fs$$1 = options.fs || _fs;
  var shouldThrow = true;

  if ('throws' in options) {
    shouldThrow = options.throws;
  }

  fs$$1.readFile(file, options, function (err, data) {
    if (err) return callback(err);
    data = stripBom(data);
    var obj;

    try {
      obj = JSON.parse(data, options ? options.reviver : null);
    } catch (err2) {
      if (shouldThrow) {
        err2.message = file + ': ' + err2.message;
        return callback(err2);
      } else {
        return callback(null, null);
      }
    }

    callback(null, obj);
  });
}

function readFileSync(file, options) {
  options = options || {};

  if (typeof options === 'string') {
    options = {
      encoding: options
    };
  }

  var fs$$1 = options.fs || _fs;
  var shouldThrow = true;

  if ('throws' in options) {
    shouldThrow = options.throws;
  }

  try {
    var content = fs$$1.readFileSync(file, options);
    content = stripBom(content);
    return JSON.parse(content, options.reviver);
  } catch (err) {
    if (shouldThrow) {
      err.message = file + ': ' + err.message;
      throw err;
    } else {
      return null;
    }
  }
}

function stringify(obj, options) {
  var spaces;
  var EOL = '\n';

  if (typeof options === 'object' && options !== null) {
    if (options.spaces) {
      spaces = options.spaces;
    }

    if (options.EOL) {
      EOL = options.EOL;
    }
  }

  var str = JSON.stringify(obj, options ? options.replacer : null, spaces);
  return str.replace(/\n/g, EOL) + EOL;
}

function writeFile(file, obj, options, callback) {
  if (callback == null) {
    callback = options;
    options = {};
  }

  options = options || {};
  var fs$$1 = options.fs || _fs;
  var str = '';

  try {
    str = stringify(obj, options);
  } catch (err) {
    // Need to return whether a callback was passed or not
    if (callback) callback(err, null);
    return;
  }

  fs$$1.writeFile(file, str, options, callback);
}

function writeFileSync(file, obj, options) {
  options = options || {};
  var fs$$1 = options.fs || _fs;
  var str = stringify(obj, options); // not sure if fs.writeFileSync returns anything, but just in case

  return fs$$1.writeFileSync(file, str, options);
}

function stripBom(content) {
  // we do this because JSON.parse would convert it to a utf8 string if encoding wasn't specified
  if (Buffer.isBuffer(content)) content = content.toString('utf8');
  content = content.replace(/^\uFEFF/, '');
  return content;
}

var jsonfile = {
  readFile: readFile,
  readFileSync: readFileSync,
  writeFile: writeFile,
  writeFileSync: writeFileSync
};
var jsonfile_1 = jsonfile;

const u$8 = universalify.fromCallback;
var jsonfile$1 = {
  // jsonfile exports
  readJson: u$8(jsonfile_1.readFile),
  readJsonSync: jsonfile_1.readFileSync,
  writeJson: u$8(jsonfile_1.writeFile),
  writeJsonSync: jsonfile_1.writeFileSync
};

const pathExists$6 = pathExists_1.pathExists;

function outputJson(file, data, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  const dir = path.dirname(file);
  pathExists$6(dir, (err, itDoes) => {
    if (err) return callback(err);
    if (itDoes) return jsonfile$1.writeJson(file, data, options, callback);
    mkdirs_1$1.mkdirs(dir, err => {
      if (err) return callback(err);
      jsonfile$1.writeJson(file, data, options, callback);
    });
  });
}

var outputJson_1 = outputJson;

function outputJsonSync(file, data, options) {
  const dir = path.dirname(file);

  if (!gracefulFs.existsSync(dir)) {
    mkdirs_1$1.mkdirsSync(dir);
  }

  jsonfile$1.writeJsonSync(file, data, options);
}

var outputJsonSync_1 = outputJsonSync;

const u$9 = universalify.fromCallback;
jsonfile$1.outputJson = u$9(outputJson_1);
jsonfile$1.outputJsonSync = outputJsonSync_1; // aliases

jsonfile$1.outputJSON = jsonfile$1.outputJson;
jsonfile$1.outputJSONSync = jsonfile$1.outputJsonSync;
jsonfile$1.writeJSON = jsonfile$1.writeJson;
jsonfile$1.writeJSONSync = jsonfile$1.writeJsonSync;
jsonfile$1.readJSON = jsonfile$1.readJson;
jsonfile$1.readJSONSync = jsonfile$1.readJsonSync;
var json = jsonfile$1;

const copySync$2 = copySync$1.copySync;
const removeSync = remove.removeSync;
const mkdirpSync$1 = mkdirs_1$1.mkdirsSync;

function moveSync(src, dest, options) {
  options = options || {};
  const overwrite = options.overwrite || options.clobber || false;
  src = path.resolve(src);
  dest = path.resolve(dest);
  if (src === dest) return gracefulFs.accessSync(src);
  if (isSrcSubdir$2(src, dest)) throw new Error("Cannot move '".concat(src, "' into itself '").concat(dest, "'."));
  mkdirpSync$1(path.dirname(dest));
  tryRenameSync();

  function tryRenameSync() {
    if (overwrite) {
      try {
        return gracefulFs.renameSync(src, dest);
      } catch (err) {
        if (err.code === 'ENOTEMPTY' || err.code === 'EEXIST' || err.code === 'EPERM') {
          removeSync(dest);
          options.overwrite = false; // just overwriteed it, no need to do it again

          return moveSync(src, dest, options);
        }

        if (err.code !== 'EXDEV') throw err;
        return moveSyncAcrossDevice(src, dest, overwrite);
      }
    } else {
      try {
        gracefulFs.linkSync(src, dest);
        return gracefulFs.unlinkSync(src);
      } catch (err) {
        if (err.code === 'EXDEV' || err.code === 'EISDIR' || err.code === 'EPERM' || err.code === 'ENOTSUP') {
          return moveSyncAcrossDevice(src, dest, overwrite);
        }

        throw err;
      }
    }
  }
}

function moveSyncAcrossDevice(src, dest, overwrite) {
  const stat = gracefulFs.statSync(src);

  if (stat.isDirectory()) {
    return moveDirSyncAcrossDevice(src, dest, overwrite);
  } else {
    return moveFileSyncAcrossDevice(src, dest, overwrite);
  }
}

function moveFileSyncAcrossDevice(src, dest, overwrite) {
  const BUF_LENGTH = 64 * 1024;

  const _buff = buffer(BUF_LENGTH);

  const flags = overwrite ? 'w' : 'wx';
  const fdr = gracefulFs.openSync(src, 'r');
  const stat = gracefulFs.fstatSync(fdr);
  const fdw = gracefulFs.openSync(dest, flags, stat.mode);
  let pos = 0;

  while (pos < stat.size) {
    const bytesRead = gracefulFs.readSync(fdr, _buff, 0, BUF_LENGTH, pos);
    gracefulFs.writeSync(fdw, _buff, 0, bytesRead);
    pos += bytesRead;
  }

  gracefulFs.closeSync(fdr);
  gracefulFs.closeSync(fdw);
  return gracefulFs.unlinkSync(src);
}

function moveDirSyncAcrossDevice(src, dest, overwrite) {
  const options = {
    overwrite: false
  };

  if (overwrite) {
    removeSync(dest);
    tryCopySync();
  } else {
    tryCopySync();
  }

  function tryCopySync() {
    copySync$2(src, dest, options);
    return removeSync(src);
  }
} // return true if dest is a subdir of src, otherwise false.
// extract dest base dir and check if that is the same as src basename


function isSrcSubdir$2(src, dest) {
  try {
    return gracefulFs.statSync(src).isDirectory() && src !== dest && dest.indexOf(src) > -1 && dest.split(path.dirname(src) + path.sep)[1].split(path.sep)[0] === path.basename(src);
  } catch (e) {
    return false;
  }
}

var moveSync_1 = {
  moveSync
};

const u$a = universalify.fromCallback;
const copy$2 = copy$1.copy;
const remove$1 = remove.remove;
const mkdirp$2 = mkdirs_1$1.mkdirp;
const pathExists$7 = pathExists_1.pathExists;

function move(src, dest, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  const overwrite = opts.overwrite || opts.clobber || false;
  src = path.resolve(src);
  dest = path.resolve(dest);
  if (src === dest) return gracefulFs.access(src, cb);
  gracefulFs.stat(src, (err, st) => {
    if (err) return cb(err);

    if (st.isDirectory() && isSrcSubdir$3(src, dest)) {
      return cb(new Error("Cannot move '".concat(src, "' to a subdirectory of itself, '").concat(dest, "'.")));
    }

    mkdirp$2(path.dirname(dest), err => {
      if (err) return cb(err);
      return doRename(src, dest, overwrite, cb);
    });
  });
}

function doRename(src, dest, overwrite, cb) {
  if (overwrite) {
    return remove$1(dest, err => {
      if (err) return cb(err);
      return rename(src, dest, overwrite, cb);
    });
  }

  pathExists$7(dest, (err, destExists) => {
    if (err) return cb(err);
    if (destExists) return cb(new Error('dest already exists.'));
    return rename(src, dest, overwrite, cb);
  });
}

function rename(src, dest, overwrite, cb) {
  gracefulFs.rename(src, dest, err => {
    if (!err) return cb();
    if (err.code !== 'EXDEV') return cb(err);
    return moveAcrossDevice(src, dest, overwrite, cb);
  });
}

function moveAcrossDevice(src, dest, overwrite, cb) {
  const opts = {
    overwrite,
    errorOnExist: true
  };
  copy$2(src, dest, opts, err => {
    if (err) return cb(err);
    return remove$1(src, cb);
  });
}

function isSrcSubdir$3(src, dest) {
  const srcArray = src.split(path.sep);
  const destArray = dest.split(path.sep);
  return srcArray.reduce((acc, current, i) => {
    return acc && destArray[i] === current;
  }, true);
}

var move_1 = {
  move: u$a(move)
};

const u$b = universalify.fromCallback;
const pathExists$8 = pathExists_1.pathExists;

function outputFile(file, data, encoding, callback) {
  if (typeof encoding === 'function') {
    callback = encoding;
    encoding = 'utf8';
  }

  const dir = path.dirname(file);
  pathExists$8(dir, (err, itDoes) => {
    if (err) return callback(err);
    if (itDoes) return gracefulFs.writeFile(file, data, encoding, callback);
    mkdirs_1$1.mkdirs(dir, err => {
      if (err) return callback(err);
      gracefulFs.writeFile(file, data, encoding, callback);
    });
  });
}

function outputFileSync(file, ...args) {
  const dir = path.dirname(file);

  if (gracefulFs.existsSync(dir)) {
    return gracefulFs.writeFileSync.apply(gracefulFs, [file].concat(args));
  }

  mkdirs_1$1.mkdirsSync(dir);
  gracefulFs.writeFileSync.apply(gracefulFs, [file].concat(args));
}

var output = {
  outputFile: u$b(outputFile),
  outputFileSync
};

var lib = createCommonjsModule(function (module) {

  module.exports = Object.assign({}, // Export promiseified graceful-fs:
  fs_1$1, // Export extra methods:
  copySync$1, copy$1, empty, ensure, json, mkdirs_1$1, moveSync_1, move_1, output, pathExists_1, remove); // Export fs.promises as a getter property so that we don't trigger
  // ExperimentalWarning before fs.promises is actually accessed.

  if (Object.getOwnPropertyDescriptor(fs, 'promises')) {
    Object.defineProperty(module.exports, 'promises', {
      get() {
        return fs.promises;
      }

    });
  }
});

var liquid = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Liquid;

    module.exports = Liquid = function () {
      function Liquid() {}

      Liquid.FilterSeparator = /\|/;
      Liquid.ArgumentSeparator = /,/;
      Liquid.FilterArgumentSeparator = /\:/;
      Liquid.VariableAttributeSeparator = /\./;
      Liquid.TagStart = /\{\%/;
      Liquid.TagEnd = /\%\}/;
      Liquid.VariableSignature = /\(?[\w\-\.\[\]]\)?/;
      Liquid.VariableSegment = /[\w\-]/;
      Liquid.VariableStart = /\{\{/;
      Liquid.VariableEnd = /\}\}/;
      Liquid.VariableIncompleteEnd = /\}\}?/;
      Liquid.QuotedString = /"[^"]*"|'[^']*'/;
      Liquid.QuotedFragment = RegExp(Liquid.QuotedString.source + "|(?:[^\\s,\\|'\"]|" + Liquid.QuotedString.source + ")+");
      Liquid.StrictQuotedFragment = /"[^"]+"|'[^']+'|[^\s|:,]+/;
      Liquid.FirstFilterArgument = RegExp(Liquid.FilterArgumentSeparator.source + "(?:" + Liquid.StrictQuotedFragment.source + ")");
      Liquid.OtherFilterArgument = RegExp(Liquid.ArgumentSeparator.source + "(?:" + Liquid.StrictQuotedFragment.source + ")");
      Liquid.SpacelessFilter = RegExp("^(?:'[^']+'|\"[^\"]+\"|[^'\"])*" + Liquid.FilterSeparator.source + "(?:" + Liquid.StrictQuotedFragment.source + ")(?:" + Liquid.FirstFilterArgument.source + "(?:" + Liquid.OtherFilterArgument.source + ")*)?");
      Liquid.Expression = RegExp("(?:" + Liquid.QuotedFragment.source + "(?:" + Liquid.SpacelessFilter.source + ")*)");
      Liquid.TagAttributes = RegExp("(\\w+)\\s*\\:\\s*(" + Liquid.QuotedFragment.source + ")");
      Liquid.AnyStartingTag = /\{\{|\{\%/;
      Liquid.PartialTemplateParser = RegExp(Liquid.TagStart.source + ".*?" + Liquid.TagEnd.source + "|" + Liquid.VariableStart.source + ".*?" + Liquid.VariableIncompleteEnd.source);
      Liquid.TemplateParser = RegExp("(" + Liquid.PartialTemplateParser.source + "|" + Liquid.AnyStartingTag.source + ")");
      Liquid.VariableParser = RegExp("\\[[^\\]]+\\]|" + Liquid.VariableSegment.source + "+\\??");
      return Liquid;
    }();
  }).call(commonjsGlobal);
});

var engine = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Liquid,
        hasProp = {}.hasOwnProperty,
        slice = [].slice;
    Liquid = liquid;

    module.exports = Liquid.Engine = function () {
      function Engine() {
        var isBlockOrTagBaseClass, isSubclassOf, tag, tagName;
        this.tags = {};

        this.Strainer = function (context) {
          this.context = context;
        };

        this.registerFilters(Liquid.StandardFilters);
        this.fileSystem = new Liquid.BlankFileSystem();

        isSubclassOf = function (klass, ofKlass) {
          var ref;

          if (typeof klass !== 'function') {
            return false;
          } else if (klass === ofKlass) {
            return true;
          } else {
            return isSubclassOf((ref = klass.__super__) != null ? ref.constructor : void 0, ofKlass);
          }
        };

        for (tagName in Liquid) {
          if (!hasProp.call(Liquid, tagName)) continue;
          tag = Liquid[tagName];

          if (!isSubclassOf(tag, Liquid.Tag)) {
            continue;
          }

          isBlockOrTagBaseClass = [Liquid.Tag, Liquid.Block].indexOf(tag.constructor) >= 0;

          if (!isBlockOrTagBaseClass) {
            this.registerTag(tagName.toLowerCase(), tag);
          }
        }
      }

      Engine.prototype.registerTag = function (name, tag) {
        return this.tags[name] = tag;
      };

      Engine.prototype.registerFilters = function () {
        var filters;
        filters = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return filters.forEach(function (_this) {
          return function (filter) {
            var k, results, v;
            results = [];

            for (k in filter) {
              if (!hasProp.call(filter, k)) continue;
              v = filter[k];

              if (v instanceof Function) {
                results.push(_this.Strainer.prototype[k] = v);
              } else {
                results.push(void 0);
              }
            }

            return results;
          };
        }(this));
      };

      Engine.prototype.parse = function (source) {
        var template;
        template = new Liquid.Template();
        return template.parse(this, source);
      };

      Engine.prototype.parseAndRender = function () {
        var args, source;
        source = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
        return this.parse(source).then(function (template) {
          return template.render.apply(template, args);
        });
      };

      Engine.prototype.registerFileSystem = function (fileSystem) {
        if (!(fileSystem instanceof Liquid.BlankFileSystem)) {
          throw Liquid.ArgumentError("Must be subclass of Liquid.BlankFileSystem");
        }

        return this.fileSystem = fileSystem;
      };

      return Engine;
    }();
  }).call(commonjsGlobal);
});

var helpers = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    module.exports = {
      flatten: function (array) {
        var _flatten, output;

        output = [];

        _flatten = function (array) {
          return array.forEach(function (item) {
            if (Array.isArray(item)) {
              return _flatten(item);
            } else {
              return output.push(item);
            }
          });
        };

        _flatten(array);

        return output;
      },
      toFlatString: function (array) {
        return this.flatten(array).join("");
      },
      scan: function (string, regexp, globalMatch) {
        var _scan, result;

        if (globalMatch == null) {
          globalMatch = false;
        }

        result = [];

        _scan = function (s) {
          var l, match;
          match = regexp.exec(s);

          if (match) {
            if (match.length === 1) {
              result.push(match[0]);
            } else {
              result.push(match.slice(1));
            }

            l = match[0].length;

            if (globalMatch) {
              l = 1;
            }

            if (match.index + l < s.length) {
              return _scan(s.substring(match.index + l));
            }
          }
        };

        _scan(string);

        return result;
      }
    };
  }).call(commonjsGlobal);
});
var helpers_1 = helpers.flatten;
var helpers_2 = helpers.toFlatString;
var helpers_3 = helpers.scan;

var range = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Range;

    module.exports = Range = function () {
      function Range(start, end1, step1) {
        this.start = start;
        this.end = end1;
        this.step = step1 != null ? step1 : 0;

        if (this.step === 0) {
          if (this.end < this.start) {
            this.step = -1;
          } else {
            this.step = 1;
          }
        }

        Object.seal(this);
      }

      Range.prototype.some = function (f) {
        var current, end, step;
        current = this.start;
        end = this.end;
        step = this.step;

        if (step > 0) {
          while (current < end) {
            if (f(current)) {
              return true;
            }

            current += step;
          }
        } else {
          while (current > end) {
            if (f(current)) {
              return true;
            }

            current += step;
          }
        }

        return false;
      };

      Range.prototype.forEach = function (f) {
        return this.some(function (e) {
          f(e);
          return false;
        });
      };

      Range.prototype.toArray = function () {
        var array;
        array = [];
        this.forEach(function (e) {
          return array.push(e);
        });
        return array;
      };

      return Range;
    }();

    Object.defineProperty(Range.prototype, "length", {
      get: function () {
        return Math.floor((this.end - this.start) / this.step);
      }
    });
  }).call(commonjsGlobal);
});

var iterable = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Iterable,
        IterableForArray,
        Range,
        isString,
        extend = function (child, parent) {
      for (var key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
      }

      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    },
        hasProp = {}.hasOwnProperty;

    Range = range;

    isString = function (input) {
      return Object.prototype.toString.call(input) === "[object String]";
    };

    module.exports = Iterable = function () {
      function Iterable() {}

      Iterable.prototype.first = function () {
        return this.slice(0, 1).then(function (a) {
          return a[0];
        });
      };

      Iterable.prototype.map = function () {
        var args;
        args = arguments;
        return this.toArray().then(function (a) {
          return Promise.all(a.map.apply(a, args));
        });
      };

      Iterable.prototype.sort = function () {
        var args;
        args = arguments;
        return this.toArray().then(function (a) {
          return a.sort.apply(a, args);
        });
      };

      Iterable.prototype.toArray = function () {
        return this.slice(0);
      };

      Iterable.prototype.slice = function () {
        throw new Error(this.constructor.name + ".slice() not implemented");
      };

      Iterable.prototype.last = function () {
        throw new Error(this.constructor.name + ".last() not implemented");
      };

      Iterable.cast = function (v) {
        if (v instanceof Iterable) {
          return v;
        } else if (v instanceof Range) {
          return new IterableForArray(v.toArray());
        } else if (Array.isArray(v) || isString(v)) {
          return new IterableForArray(v);
        } else if (v != null) {
          return new IterableForArray([v]);
        } else {
          return new IterableForArray([]);
        }
      };

      return Iterable;
    }();

    IterableForArray = function (superClass) {
      extend(IterableForArray, superClass);

      function IterableForArray(array) {
        this.array = array;
      }

      IterableForArray.prototype.slice = function () {
        var ref;
        return Promise.resolve((ref = this.array).slice.apply(ref, arguments));
      };

      IterableForArray.prototype.last = function () {
        return Promise.resolve(this.array[this.array.length - 1]);
      };

      return IterableForArray;
    }(Iterable);
  }).call(commonjsGlobal);
});

var drop = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Drop;

    module.exports = Drop = function () {
      function Drop() {}

      Drop.prototype.context = null;

      Drop.prototype.hasKey = function (key) {
        return true;
      };

      Drop.prototype.invokeDrop = function (methodOrKey) {
        var value;

        if (this.constructor.isInvokable(methodOrKey)) {
          value = this[methodOrKey];

          if (typeof value === "function") {
            return value.call(this);
          } else {
            return value;
          }
        } else {
          return this.beforeMethod(methodOrKey);
        }
      };

      Drop.prototype.beforeMethod = function (method) {};

      Drop.isInvokable = function (method) {
        if (this.invokableMethods == null) {
          this.invokableMethods = function (_this) {
            return function () {
              var blacklist, whitelist;
              blacklist = Object.keys(Drop.prototype);
              whitelist = ["toLiquid"];
              Object.keys(_this.prototype).forEach(function (k) {
                if (!(blacklist.indexOf(k) >= 0)) {
                  return whitelist.push(k);
                }
              });
              return whitelist;
            };
          }(this)();
        }

        return this.invokableMethods.indexOf(method) >= 0;
      };

      Drop.prototype.get = function (methodOrKey) {
        return this.invokeDrop(methodOrKey);
      };

      Drop.prototype.toLiquid = function () {
        return this;
      };

      Drop.prototype.toString = function () {
        return "[Liquid.Drop " + this.constructor.name + "]";
      };

      return Drop;
    }();
  }).call(commonjsGlobal);
});

var context = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Context,
        Liquid,
        slice = [].slice,
        hasProp = {}.hasOwnProperty;
    Liquid = liquid;

    module.exports = Context = function () {
      function Context(engine, environments, outerScope, registers, rethrowErrors) {
        var ref;

        if (environments == null) {
          environments = {};
        }

        if (outerScope == null) {
          outerScope = {};
        }

        if (registers == null) {
          registers = {};
        }

        if (rethrowErrors == null) {
          rethrowErrors = false;
        }

        this.environments = Liquid.Helpers.flatten([environments]);
        this.scopes = [outerScope];
        this.registers = registers;
        this.errors = [];
        this.rethrowErrors = rethrowErrors;
        this.strainer = (ref = engine != null ? new engine.Strainer(this) : void 0) != null ? ref : {};
        this.squashInstanceAssignsWithEnvironments();
      }

      Context.prototype.registerFilters = function () {
        var filter, filters, i, k, len, v;
        filters = 1 <= arguments.length ? slice.call(arguments, 0) : [];

        for (i = 0, len = filters.length; i < len; i++) {
          filter = filters[i];

          for (k in filter) {
            if (!hasProp.call(filter, k)) continue;
            v = filter[k];

            if (v instanceof Function) {
              this.strainer[k] = v;
            }
          }
        }
      };

      Context.prototype.handleError = function (e) {
        this.errors.push(e);

        if (this.rethrowErrors) {
          throw e;
        }

        if (e instanceof Liquid.SyntaxError) {
          return "Liquid syntax error: " + e.message;
        } else {
          return "Liquid error: " + e.message;
        }
      };

      Context.prototype.invoke = function () {
        var args, available, method, methodName;
        methodName = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
        method = this.strainer[methodName];

        if (method instanceof Function) {
          return method.apply(this.strainer, args);
        } else {
          available = Object.keys(this.strainer);
          throw new Liquid.FilterNotFound("Unknown filter `" + methodName + "`, available: [" + available.join(', ') + "]");
        }
      };

      Context.prototype.push = function (newScope) {
        if (newScope == null) {
          newScope = {};
        }

        this.scopes.unshift(newScope);

        if (this.scopes.length > 100) {
          throw new Error("Nesting too deep");
        }
      };

      Context.prototype.merge = function (newScope) {
        var k, results, v;

        if (newScope == null) {
          newScope = {};
        }

        results = [];

        for (k in newScope) {
          if (!hasProp.call(newScope, k)) continue;
          v = newScope[k];
          results.push(this.scopes[0][k] = v);
        }

        return results;
      };

      Context.prototype.pop = function () {
        if (this.scopes.length <= 1) {
          throw new Error("ContextError");
        }

        return this.scopes.shift();
      };

      Context.prototype.lastScope = function () {
        return this.scopes[this.scopes.length - 1];
      };

      Context.prototype.stack = function (newScope, f) {
        var popLater, result;

        if (newScope == null) {
          newScope = {};
        }

        popLater = false;

        try {
          if (arguments.length < 2) {
            f = newScope;
            newScope = {};
          }

          this.push(newScope);
          result = f();

          if ((result != null ? result.nodeify : void 0) != null) {
            popLater = true;
            result.nodeify(function (_this) {
              return function () {
                return _this.pop();
              };
            }(this));
          }

          return result;
        } finally {
          if (!popLater) {
            this.pop();
          }
        }
      };

      Context.prototype.clearInstanceAssigns = function () {
        return this.scopes[0] = {};
      };

      Context.prototype.set = function (key, value) {
        return this.scopes[0][key] = value;
      };

      Context.prototype.get = function (key) {
        return this.resolve(key);
      };

      Context.prototype.hasKey = function (key) {
        return Promise.resolve(this.resolve(key)).then(function (v) {
          return v != null;
        });
      };

      Context.Literals = {
        'null': null,
        'nil': null,
        '': null,
        'true': true,
        'false': false
      };

      Context.prototype.resolve = function (key) {
        var hi, lo, match;

        if (Liquid.Context.Literals.hasOwnProperty(key)) {
          return Liquid.Context.Literals[key];
        } else if (match = /^'(.*)'$/.exec(key)) {
          return match[1];
        } else if (match = /^"(.*)"$/.exec(key)) {
          return match[1];
        } else if (match = /^(\d+)$/.exec(key)) {
          return Number(match[1]);
        } else if (match = /^\((\S+)\.\.(\S+)\)$/.exec(key)) {
          lo = this.resolve(match[1]);
          hi = this.resolve(match[2]);
          return Promise.all([lo, hi]).then(function (arg) {
            var hi, lo;
            lo = arg[0], hi = arg[1];
            lo = Number(lo);
            hi = Number(hi);

            if (isNaN(lo) || isNaN(hi)) {
              return [];
            }

            return new Liquid.Range(lo, hi + 1);
          });
        } else if (match = /^(\d[\d\.]+)$/.exec(key)) {
          return Number(match[1]);
        } else {
          return this.variable(key);
        }
      };

      Context.prototype.findVariable = function (key) {
        var variable, variableScope;
        variableScope = void 0;
        variable = void 0;
        this.scopes.some(function (scope) {
          if (scope.hasOwnProperty(key)) {
            variableScope = scope;
            return true;
          }
        });

        if (variableScope == null) {
          this.environments.some(function (_this) {
            return function (env) {
              variable = _this.lookupAndEvaluate(env, key);

              if (variable != null) {
                return variableScope = env;
              }
            };
          }(this));
        }

        if (variableScope == null) {
          if (this.environments.length > 0) {
            variableScope = this.environments[this.environments.length - 1];
          } else if (this.scopes.length > 0) {
            variableScope = this.scopes[this.scopes.length - 1];
          } else {
            throw new Error("No scopes to find variable in.");
          }
        }

        if (variable == null) {
          variable = this.lookupAndEvaluate(variableScope, key);
        }

        return Promise.resolve(variable).then(function (_this) {
          return function (v) {
            return _this.liquify(v);
          };
        }(this));
      };

      Context.prototype.variable = function (markup) {
        return Promise.resolve().then(function (_this) {
          return function () {
            var firstPart, iterator, mapper, match, object, parts, squareBracketed;
            parts = Liquid.Helpers.scan(markup, Liquid.VariableParser);
            squareBracketed = /^\[(.*)\]$/;
            firstPart = parts.shift();

            if (match = squareBracketed.exec(firstPart)) {
              firstPart = match[1];
            }

            object = _this.findVariable(firstPart);

            if (parts.length === 0) {
              return object;
            }

            mapper = function (part, object) {
              if (object == null) {
                return Promise.resolve(object);
              }

              return Promise.resolve(object).then(_this.liquify.bind(_this)).then(function (object) {
                var bracketMatch;

                if (object == null) {
                  return object;
                }

                bracketMatch = squareBracketed.exec(part);

                if (bracketMatch) {
                  part = _this.resolve(bracketMatch[1]);
                }

                return Promise.resolve(part).then(function (part) {
                  var isArrayAccess, isObjectAccess, isSpecialAccess;
                  isArrayAccess = Array.isArray(object) && isFinite(part);
                  isObjectAccess = object instanceof Object && ((typeof object.hasKey === "function" ? object.hasKey(part) : void 0) || part in object);
                  isSpecialAccess = !bracketMatch && object && (Array.isArray(object) || Object.prototype.toString.call(object) === "[object String]") && ["size", "first", "last"].indexOf(part) >= 0;

                  if (isArrayAccess || isObjectAccess) {
                    return Promise.resolve(_this.lookupAndEvaluate(object, part)).then(_this.liquify.bind(_this));
                  } else if (isSpecialAccess) {
                    switch (part) {
                      case "size":
                        return _this.liquify(object.length);

                      case "first":
                        return _this.liquify(object[0]);

                      case "last":
                        return _this.liquify(object[object.length - 1]);

                      default:
                        /* @covignore */
                        throw new Error("Unknown special accessor: " + part);
                    }
                  }
                });
              });
            };

            iterator = function (object, index) {
              if (index < parts.length) {
                return mapper(parts[index], object).then(function (object) {
                  return iterator(object, index + 1);
                });
              } else {
                return Promise.resolve(object);
              }
            };

            return iterator(object, 0)["catch"](function (err) {
              throw new Error("Couldn't walk variable: " + markup + ": " + err);
            });
          };
        }(this));
      };

      Context.prototype.lookupAndEvaluate = function (obj, key) {
        if (obj instanceof Liquid.Drop) {
          return obj.get(key);
        } else {
          return obj != null ? obj[key] : void 0;
        }
      };

      Context.prototype.squashInstanceAssignsWithEnvironments = function () {
        var lastScope;
        lastScope = this.lastScope();
        return Object.keys(lastScope).forEach(function (_this) {
          return function (key) {
            return _this.environments.some(function (env) {
              if (env.hasOwnProperty(key)) {
                lastScope[key] = _this.lookupAndEvaluate(env, key);
                return true;
              }
            });
          };
        }(this));
      };

      Context.prototype.liquify = function (object) {
        return Promise.resolve(object).then(function (_this) {
          return function (object) {
            if (object == null) {
              return object;
            } else if (typeof object.toLiquid === "function") {
              object = object.toLiquid();
            } else if (typeof object === "object") ; else if (typeof object === "function") {
              object = "";
            } else {
              Object.prototype.toString.call(object);
            }

            if (object instanceof Liquid.Drop) {
              object.context = _this;
            }

            return object;
          };
        }(this));
      };

      return Context;
    }();
  }).call(commonjsGlobal);
});

var tag = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Tag,
        slice = [].slice;

    module.exports = Tag = function () {
      function Tag(template, tagName, markup) {
        this.template = template;
        this.tagName = tagName;
        this.markup = markup;
      }

      Tag.prototype.parseWithCallbacks = function () {
        var args, parse;
        args = 1 <= arguments.length ? slice.call(arguments, 0) : [];

        if (this.afterParse) {
          parse = function (_this) {
            return function () {
              return _this.parse.apply(_this, args).then(function () {
                return _this.afterParse.apply(_this, args);
              });
            };
          }(this);
        } else {
          parse = function (_this) {
            return function () {
              return _this.parse.apply(_this, args);
            };
          }(this);
        }

        if (this.beforeParse) {
          return Promise.resolve(this.beforeParse.apply(this, args)).then(parse);
        } else {
          return parse();
        }
      };

      Tag.prototype.parse = function () {};

      Tag.prototype.name = function () {
        return this.constructor.name.toLowerCase();
      };

      Tag.prototype.render = function () {
        return "";
      };

      return Tag;
    }();
  }).call(commonjsGlobal);
});

var block = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Block,
        Liquid,
        Promise_each,
        extend = function (child, parent) {
      for (var key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
      }

      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    },
        hasProp = {}.hasOwnProperty;

    Liquid = liquid;

    Promise_each = function (promises, cb) {
      var iterator;

      iterator = function (index) {
        var promise;

        if (index >= promises.length) {
          return Promise.resolve();
        }

        promise = promises[index];
        return Promise.resolve(promise).then(function (value) {
          return Promise.resolve(cb(value)).then(function () {
            return iterator(index + 1);
          });
        });
      };

      return iterator(0);
    };

    module.exports = Block = function (superClass) {
      extend(Block, superClass);

      function Block() {
        return Block.__super__.constructor.apply(this, arguments);
      }

      Block.IsTag = RegExp("^" + Liquid.TagStart.source);
      Block.IsVariable = RegExp("^" + Liquid.VariableStart.source);
      Block.FullToken = RegExp("^" + Liquid.TagStart.source + "\\s*(\\w+)\\s*(.*)?" + Liquid.TagEnd.source + "$");
      Block.ContentOfVariable = RegExp("^" + Liquid.VariableStart.source + "(.*)" + Liquid.VariableEnd.source + "$");

      Block.prototype.beforeParse = function () {
        if (this.nodelist == null) {
          this.nodelist = [];
        }

        return this.nodelist.length = 0;
      };

      Block.prototype.afterParse = function () {
        return this.assertMissingDelimitation();
      };

      Block.prototype.parse = function (tokens) {
        var token;

        if (tokens.length === 0 || this.ended) {
          return Promise.resolve();
        }

        token = tokens.shift();
        return Promise.resolve().then(function (_this) {
          return function () {
            return _this.parseToken(token, tokens);
          };
        }(this))["catch"](function (e) {
          e.message = e.message + "\n    at " + token.value + " (" + token.filename + ":" + token.line + ":" + token.col + ")";

          if (e.location == null) {
            e.location = {
              col: token.col,
              line: token.line,
              filename: token.filename
            };
          }

          throw e;
        }).then(function (_this) {
          return function () {
            return _this.parse(tokens);
          };
        }(this));
      };

      Block.prototype.parseToken = function (token, tokens) {
        var Tag, match, tag;

        if (Block.IsTag.test(token.value)) {
          match = Block.FullToken.exec(token.value);

          if (!match) {
            throw new Liquid.SyntaxError("Tag '" + token.value + "' was not properly terminated with regexp: " + Liquid.TagEnd.inspect);
          }

          if (this.blockDelimiter() === match[1]) {
            return this.endTag();
          }

          Tag = this.template.tags[match[1]];

          if (!Tag) {
            return this.unknownTag(match[1], match[2], tokens);
          }

          tag = new Tag(this.template, match[1], match[2]);
          this.nodelist.push(tag);
          return tag.parseWithCallbacks(tokens);
        } else if (Block.IsVariable.test(token.value)) {
          return this.nodelist.push(this.createVariable(token));
        } else if (token.value.length === 0) ; else {
          return this.nodelist.push(token.value);
        }
      };

      Block.prototype.endTag = function () {
        return this.ended = true;
      };

      Block.prototype.unknownTag = function (tag, params, tokens) {
        if (tag === 'else') {
          throw new Liquid.SyntaxError(this.blockName() + " tag does not expect else tag");
        } else if (tag === 'end') {
          throw new Liquid.SyntaxError("'end' is not a valid delimiter for " + this.blockName() + " tags. use " + this.blockDelimiter());
        } else {
          throw new Liquid.SyntaxError("Unknown tag '" + tag + "'");
        }
      };

      Block.prototype.blockDelimiter = function () {
        return "end" + this.blockName();
      };

      Block.prototype.blockName = function () {
        return this.tagName;
      };

      Block.prototype.createVariable = function (token) {
        var match, ref;
        match = (ref = Liquid.Block.ContentOfVariable.exec(token.value)) != null ? ref[1] : void 0;

        if (match) {
          return new Liquid.Variable(match);
        }

        throw new Liquid.SyntaxError("Variable '" + token.value + "' was not properly terminated with regexp: " + Liquid.VariableEnd.inspect);
      };

      Block.prototype.render = function (context) {
        return this.renderAll(this.nodelist, context);
      };

      Block.prototype.assertMissingDelimitation = function () {
        if (!this.ended) {
          throw new Liquid.SyntaxError(this.blockName() + " tag was never closed");
        }
      };

      Block.prototype.renderAll = function (list, context) {
        var accumulator;
        accumulator = [];
        return Promise_each(list, function (token) {
          if (typeof (token != null ? token.render : void 0) !== "function") {
            accumulator.push(token);
            return;
          }

          return Promise.resolve().then(function () {
            return token.render(context);
          }).then(function (s) {
            return accumulator.push(s);
          }, function (e) {
            return accumulator.push(context.handleError(e));
          });
        }).then(function () {
          return accumulator;
        });
      };

      return Block;
    }(Liquid.Tag);
  }).call(commonjsGlobal);
});

var document$1 = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Liquid,
        extend = function (child, parent) {
      for (var key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
      }

      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    },
        hasProp = {}.hasOwnProperty;

    Liquid = liquid;

    module.exports = Liquid.Document = function (superClass) {
      extend(Document, superClass);

      function Document(template) {
        this.template = template;
      }

      Document.prototype.blockDelimiter = function () {
        return [];
      };

      Document.prototype.assertMissingDelimitation = function () {};

      return Document;
    }(Liquid.Block);
  }).call(commonjsGlobal);
});

var promise_reduce = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var reduce;

    reduce = function (collection, reducer, value) {
      return Promise.all(collection).then(function (items) {
        return items.reduce(function (promise, item, index, length) {
          return promise.then(function (value) {
            return reducer(value, item, index, length);
          });
        }, Promise.resolve(value));
      });
    };

    module.exports = reduce;
  }).call(commonjsGlobal);
});

var variable = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Liquid,
        PromiseReduce,
        Variable,
        slice = [].slice;
    Liquid = liquid;
    PromiseReduce = promise_reduce;

    module.exports = Variable = function () {
      var FilterArgParser, FilterListFragment, VariableNameFragment;
      Variable.FilterParser = RegExp("(?:" + Liquid.FilterSeparator.source + "|(?:\\s*(?!(?:" + Liquid.FilterSeparator.source + "))(?:" + Liquid.QuotedFragment.source + "|\\S+)\\s*)+)");
      VariableNameFragment = RegExp("\\s*(" + Liquid.QuotedFragment.source + ")(.*)");
      FilterListFragment = RegExp(Liquid.FilterSeparator.source + "\\s*(.*)");
      FilterArgParser = RegExp("(?:" + Liquid.FilterArgumentSeparator.source + "|" + Liquid.ArgumentSeparator.source + ")\\s*(" + Liquid.QuotedFragment.source + ")");

      function Variable(markup) {
        var filters, match;
        this.markup = markup;
        this.name = null;
        this.filters = [];
        match = VariableNameFragment.exec(this.markup);

        if (!match) {
          return;
        }

        this.name = match[1];
        match = FilterListFragment.exec(match[2]);

        if (!match) {
          return;
        }

        filters = Liquid.Helpers.scan(match[1], Liquid.Variable.FilterParser);
        filters.forEach(function (_this) {
          return function (filter) {
            var filterArgs, filterName;
            match = /\s*(\w+)/.exec(filter);

            if (!match) {
              return;
            }

            filterName = match[1];
            filterArgs = Liquid.Helpers.scan(filter, FilterArgParser);
            filterArgs = Liquid.Helpers.flatten(filterArgs);
            return _this.filters.push([filterName, filterArgs]);
          };
        }(this));
      }

      Variable.prototype.render = function (context) {
        var filtered, reducer, value;

        if (this.name == null) {
          return '';
        }

        reducer = function (_this) {
          return function (input, filter) {
            var filterArgs;
            filterArgs = filter[1].map(function (a) {
              return context.get(a);
            });
            return Promise.all([input].concat(slice.call(filterArgs))).then(function (results) {
              var e;
              input = results.shift();

              try {
                return context.invoke.apply(context, [filter[0], input].concat(slice.call(results)));
              } catch (error) {
                e = error;

                if (!(e instanceof Liquid.FilterNotFound)) {
                  throw e;
                }

                throw new Liquid.FilterNotFound("Error - filter '" + filter[0] + "' in '" + _this.markup + "' could not be found.");
              }
            });
          };
        }(this);

        value = Promise.resolve(context.get(this.name));

        switch (this.filters.length) {
          case 0:
            filtered = value;
            break;

          case 1:
            filtered = reducer(value, this.filters[0]);
            break;

          default:
            filtered = PromiseReduce(this.filters, reducer, value);
        }

        return filtered.then(function (f) {
          if (!(f instanceof Liquid.Drop)) {
            return f;
          }

          f.context = context;
          return f.toString();
        })["catch"](function (e) {
          return context.handleError(e);
        });
      };

      return Variable;
    }();
  }).call(commonjsGlobal);
});

var template = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Liquid,
        slice = [].slice,
        hasProp = {}.hasOwnProperty;
    Liquid = liquid;

    module.exports = Liquid.Template = function () {
      function Template() {
        this.registers = {};
        this.assigns = {};
        this.instanceAssigns = {};
        this.tags = {};
        this.errors = [];
        this.rethrowErrors = true;
      }

      Template.prototype.parse = function (engine, source) {
        this.engine = engine;

        if (source == null) {
          source = "";
        }

        return Promise.resolve().then(function (_this) {
          return function () {
            var tokens;
            tokens = _this._tokenize(source);
            _this.tags = _this.engine.tags;
            _this.root = new Liquid.Document(_this);
            return _this.root.parseWithCallbacks(tokens).then(function () {
              return _this;
            });
          };
        }(this));
      };

      Template.prototype.render = function () {
        var args;
        args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return Promise.resolve().then(function (_this) {
          return function () {
            return _this._render.apply(_this, args);
          };
        }(this));
      };

      Template.prototype._render = function (assigns, options) {
        var context, k, ref, v;

        if (this.root == null) {
          throw new Error("No document root. Did you parse the document yet?");
        }

        context = function () {
          if (assigns instanceof Liquid.Context) {
            return assigns;
          } else if (assigns instanceof Object) {
            assigns = [assigns, this.assigns];
            return new Liquid.Context(this.engine, assigns, this.instanceAssigns, this.registers, this.rethrowErrors);
          } else if (assigns == null) {
            return new Liquid.Context(this.engine, this.assigns, this.instanceAssigns, this.registers, this.rethrowErrors);
          } else {
            throw new Error("Expected Object or Liquid::Context as parameter, but was " + typeof assigns + ".");
          }
        }.call(this);

        if (options != null ? options.registers : void 0) {
          ref = options.registers;

          for (k in ref) {
            if (!hasProp.call(ref, k)) continue;
            v = ref[k];
            this.registers[k] = v;
          }
        }

        if (options != null ? options.filters : void 0) {
          context.registerFilters.apply(context, options.filters);
        }

        return this.root.render(context).then(function (chunks) {
          return Liquid.Helpers.toFlatString(chunks);
        }).then(function (result) {
          this.errors = context.errors;
          return result;
        }, function (error) {
          this.errors = context.errors;
          throw error;
        });
      };

      Template.prototype._tokenize = function (source) {
        var col, line, tokens;
        source = String(source);

        if (source.length === 0) {
          return [];
        }

        tokens = source.split(Liquid.TemplateParser);
        line = 1;
        col = 1;
        return tokens.filter(function (token) {
          return token.length > 0;
        }).map(function (value) {
          var lastIndex, linebreaks, result;
          result = {
            value: value,
            col: col,
            line: line
          };
          lastIndex = value.lastIndexOf("\n");

          if (lastIndex < 0) {
            col += value.length;
          } else {
            linebreaks = value.split("\n").length - 1;
            line += linebreaks;
            col = value.length - lastIndex;
          }

          return result;
        });
      };

      return Template;
    }();
  }).call(commonjsGlobal);
});

var strftime = createCommonjsModule(function (module) {

  (function () {
    var DefaultLocale = {
      days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      shortDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      AM: 'AM',
      PM: 'PM',
      am: 'am',
      pm: 'pm',
      formats: {
        D: '%m/%d/%y',
        F: '%Y-%m-%d',
        R: '%H:%M',
        T: '%H:%M:%S',
        X: '%T',
        c: '%a %b %d %X %Y',
        r: '%I:%M:%S %p',
        v: '%e-%b-%Y',
        x: '%D'
      }
    },
        defaultStrftime = new Strftime(DefaultLocale, 0, false),
        namespace; // CommonJS / Node module

    {
      namespace = module.exports = adaptedStrftime;
      namespace.strftime = deprecatedStrftime;
    } // Deprecated API, to be removed in v1.0


    var _require = "require('strftime')";

    var _deprecationWarnings = {};

    function deprecationWarning(name, instead) {
      if (!_deprecationWarnings[name]) {
        if (typeof console !== 'undefined' && typeof console.warn == 'function') {
          console.warn("[WARNING] " + name + " is deprecated and will be removed in version 1.0. Instead, use `" + instead + "`.");
        }

        _deprecationWarnings[name] = true;
      }
    }

    namespace.strftimeTZ = deprecatedStrftimeTZ;
    namespace.strftimeUTC = deprecatedStrftimeUTC;
    namespace.localizedStrftime = deprecatedStrftimeLocalized; // Adapt the old API while preserving the new API.

    function adaptForwards(fn) {
      fn.localize = defaultStrftime.localize.bind(defaultStrftime);
      fn.timezone = defaultStrftime.timezone.bind(defaultStrftime);
      fn.utc = defaultStrftime.utc.bind(defaultStrftime);
    }

    adaptForwards(adaptedStrftime);

    function adaptedStrftime(fmt, d, locale) {
      // d and locale are optional, check if this is (format, locale)
      if (d && d.days) {
        locale = d;
        d = undefined;
      }

      if (locale) {
        deprecationWarning("`" + _require + "(format, [date], [locale])`", "var s = " + _require + ".localize(locale); s(format, [date])");
      }

      var strftime = locale ? defaultStrftime.localize(locale) : defaultStrftime;
      return strftime(fmt, d);
    }

    adaptForwards(deprecatedStrftime);

    function deprecatedStrftime(fmt, d, locale) {
      if (locale) {
        deprecationWarning("`" + _require + ".strftime(format, [date], [locale])`", "var s = " + _require + ".localize(locale); s(format, [date])");
      } else {
        deprecationWarning("`" + _require + ".strftime(format, [date])`", _require + "(format, [date])");
      }

      var strftime = locale ? defaultStrftime.localize(locale) : defaultStrftime;
      return strftime(fmt, d);
    }

    function deprecatedStrftimeTZ(fmt, d, locale, timezone) {
      // locale is optional, check if this is (format, date, timezone)
      if ((typeof locale == 'number' || typeof locale == 'string') && timezone == null) {
        timezone = locale;
        locale = undefined;
      }

      if (locale) {
        deprecationWarning("`" + _require + ".strftimeTZ(format, date, locale, tz)`", "var s = " + _require + ".localize(locale).timezone(tz); s(format, [date])` or `var s = " + _require + ".localize(locale); s.timezone(tz)(format, [date])");
      } else {
        deprecationWarning("`" + _require + ".strftimeTZ(format, date, tz)`", "var s = " + _require + ".timezone(tz); s(format, [date])` or `" + _require + ".timezone(tz)(format, [date])");
      }

      var strftime = (locale ? defaultStrftime.localize(locale) : defaultStrftime).timezone(timezone);
      return strftime(fmt, d);
    }

    var utcStrftime = defaultStrftime.utc();

    function deprecatedStrftimeUTC(fmt, d, locale) {
      if (locale) {
        deprecationWarning("`" + _require + ".strftimeUTC(format, date, locale)`", "var s = " + _require + ".localize(locale).utc(); s(format, [date])");
      } else {
        deprecationWarning("`" + _require + ".strftimeUTC(format, [date])`", "var s = " + _require + ".utc(); s(format, [date])");
      }

      var strftime = locale ? utcStrftime.localize(locale) : utcStrftime;
      return strftime(fmt, d);
    }

    function deprecatedStrftimeLocalized(locale) {
      deprecationWarning("`" + _require + ".localizedStrftime(locale)`", _require + ".localize(locale)");
      return defaultStrftime.localize(locale);
    } // End of deprecated API
    // Polyfill Date.now for old browsers.


    if (typeof Date.now !== 'function') {
      Date.now = function () {
        return +new Date();
      };
    }

    function Strftime(locale, customTimezoneOffset, useUtcTimezone) {
      var _locale = locale || DefaultLocale,
          _customTimezoneOffset = customTimezoneOffset || 0,
          _useUtcBasedDate = useUtcTimezone || false,
          // we store unix timestamp value here to not create new Date() each iteration (each millisecond)
      // Date.now() is 2 times faster than new Date()
      // while millisecond precise is enough here
      // this could be very helpful when strftime triggered a lot of times one by one
      _cachedDateTimestamp = 0,
          _cachedDate;

      function _strftime(format, date) {
        var timestamp;

        if (!date) {
          var currentTimestamp = Date.now();

          if (currentTimestamp > _cachedDateTimestamp) {
            _cachedDateTimestamp = currentTimestamp;
            _cachedDate = new Date(_cachedDateTimestamp);
            timestamp = _cachedDateTimestamp;

            if (_useUtcBasedDate) {
              // how to avoid duplication of date instantiation for utc here?
              // we tied to getTimezoneOffset of the current date
              _cachedDate = new Date(_cachedDateTimestamp + getTimestampToUtcOffsetFor(_cachedDate) + _customTimezoneOffset);
            }
          } else {
            timestamp = _cachedDateTimestamp;
          }

          date = _cachedDate;
        } else {
          timestamp = date.getTime();

          if (_useUtcBasedDate) {
            date = new Date(date.getTime() + getTimestampToUtcOffsetFor(date) + _customTimezoneOffset);
          }
        }

        return _processFormat(format, date, _locale, timestamp);
      }

      function _processFormat(format, date, locale, timestamp) {
        var resultString = '',
            padding = null,
            isInScope = false,
            length = format.length,
            extendedTZ = false;

        for (var i = 0; i < length; i++) {
          var currentCharCode = format.charCodeAt(i);

          if (isInScope === true) {
            // '-'
            if (currentCharCode === 45) {
              padding = '';
              continue;
            } // '_'
            else if (currentCharCode === 95) {
                padding = ' ';
                continue;
              } // '0'
              else if (currentCharCode === 48) {
                  padding = '0';
                  continue;
                } // ':'
                else if (currentCharCode === 58) {
                    if (extendedTZ) {
                      if (typeof console !== 'undefined' && typeof console.warn == 'function') {
                        console.warn("[WARNING] detected use of unsupported %:: or %::: modifiers to strftime");
                      }
                    }

                    extendedTZ = true;
                    continue;
                  }

            switch (currentCharCode) {
              // Examples for new Date(0) in GMT
              // 'Thursday'
              // case 'A':
              case 65:
                resultString += locale.days[date.getDay()];
                break;
              // 'January'
              // case 'B':

              case 66:
                resultString += locale.months[date.getMonth()];
                break;
              // '19'
              // case 'C':

              case 67:
                resultString += padTill2(Math.floor(date.getFullYear() / 100), padding);
                break;
              // '01/01/70'
              // case 'D':

              case 68:
                resultString += _processFormat(locale.formats.D, date, locale, timestamp);
                break;
              // '1970-01-01'
              // case 'F':

              case 70:
                resultString += _processFormat(locale.formats.F, date, locale, timestamp);
                break;
              // '00'
              // case 'H':

              case 72:
                resultString += padTill2(date.getHours(), padding);
                break;
              // '12'
              // case 'I':

              case 73:
                resultString += padTill2(hours12(date.getHours()), padding);
                break;
              // '000'
              // case 'L':

              case 76:
                resultString += padTill3(Math.floor(timestamp % 1000));
                break;
              // '00'
              // case 'M':

              case 77:
                resultString += padTill2(date.getMinutes(), padding);
                break;
              // 'am'
              // case 'P':

              case 80:
                resultString += date.getHours() < 12 ? locale.am : locale.pm;
                break;
              // '00:00'
              // case 'R':

              case 82:
                resultString += _processFormat(locale.formats.R, date, locale, timestamp);
                break;
              // '00'
              // case 'S':

              case 83:
                resultString += padTill2(date.getSeconds(), padding);
                break;
              // '00:00:00'
              // case 'T':

              case 84:
                resultString += _processFormat(locale.formats.T, date, locale, timestamp);
                break;
              // '00'
              // case 'U':

              case 85:
                resultString += padTill2(weekNumber(date, 'sunday'), padding);
                break;
              // '00'
              // case 'W':

              case 87:
                resultString += padTill2(weekNumber(date, 'monday'), padding);
                break;
              // '16:00:00'
              // case 'X':

              case 88:
                resultString += _processFormat(locale.formats.X, date, locale, timestamp);
                break;
              // '1970'
              // case 'Y':

              case 89:
                resultString += date.getFullYear();
                break;
              // 'GMT'
              // case 'Z':

              case 90:
                if (_useUtcBasedDate && _customTimezoneOffset === 0) {
                  resultString += "GMT";
                } else {
                  // fixme optimize
                  var tzString = date.toString().match(/\(([\w\s]+)\)/);
                  resultString += tzString && tzString[1] || '';
                }

                break;
              // 'Thu'
              // case 'a':

              case 97:
                resultString += locale.shortDays[date.getDay()];
                break;
              // 'Jan'
              // case 'b':

              case 98:
                resultString += locale.shortMonths[date.getMonth()];
                break;
              // ''
              // case 'c':

              case 99:
                resultString += _processFormat(locale.formats.c, date, locale, timestamp);
                break;
              // '01'
              // case 'd':

              case 100:
                resultString += padTill2(date.getDate(), padding);
                break;
              // ' 1'
              // case 'e':

              case 101:
                resultString += padTill2(date.getDate(), padding == null ? ' ' : padding);
                break;
              // 'Jan'
              // case 'h':

              case 104:
                resultString += locale.shortMonths[date.getMonth()];
                break;
              // '000'
              // case 'j':

              case 106:
                var y = new Date(date.getFullYear(), 0, 1);
                var day = Math.ceil((date.getTime() - y.getTime()) / (1000 * 60 * 60 * 24));
                resultString += padTill3(day);
                break;
              // ' 0'
              // case 'k':

              case 107:
                resultString += padTill2(date.getHours(), padding == null ? ' ' : padding);
                break;
              // '12'
              // case 'l':

              case 108:
                resultString += padTill2(hours12(date.getHours()), padding == null ? ' ' : padding);
                break;
              // '01'
              // case 'm':

              case 109:
                resultString += padTill2(date.getMonth() + 1, padding);
                break;
              // '\n'
              // case 'n':

              case 110:
                resultString += '\n';
                break;
              // '1st'
              // case 'o':

              case 111:
                resultString += String(date.getDate()) + ordinal(date.getDate());
                break;
              // 'AM'
              // case 'p':

              case 112:
                resultString += date.getHours() < 12 ? locale.AM : locale.PM;
                break;
              // '12:00:00 AM'
              // case 'r':

              case 114:
                resultString += _processFormat(locale.formats.r, date, locale, timestamp);
                break;
              // '0'
              // case 's':

              case 115:
                resultString += Math.floor(timestamp / 1000);
                break;
              // '\t'
              // case 't':

              case 116:
                resultString += '\t';
                break;
              // '4'
              // case 'u':

              case 117:
                var day = date.getDay();
                resultString += day === 0 ? 7 : day;
                break;
              // 1 - 7, Monday is first day of the week
              // ' 1-Jan-1970'
              // case 'v':

              case 118:
                resultString += _processFormat(locale.formats.v, date, locale, timestamp);
                break;
              // '4'
              // case 'w':

              case 119:
                resultString += date.getDay();
                break;
              // 0 - 6, Sunday is first day of the week
              // '12/31/69'
              // case 'x':

              case 120:
                resultString += _processFormat(locale.formats.x, date, locale, timestamp);
                break;
              // '70'
              // case 'y':

              case 121:
                resultString += ('' + date.getFullYear()).slice(2);
                break;
              // '+0000'
              // case 'z':

              case 122:
                if (_useUtcBasedDate && _customTimezoneOffset === 0) {
                  resultString += extendedTZ ? "+00:00" : "+0000";
                } else {
                  var off;

                  if (_customTimezoneOffset !== 0) {
                    off = _customTimezoneOffset / (60 * 1000);
                  } else {
                    off = -date.getTimezoneOffset();
                  }

                  var sign = off < 0 ? '-' : '+';
                  var sep = extendedTZ ? ':' : '';
                  var hours = Math.floor(Math.abs(off / 60));
                  var mins = Math.abs(off % 60);
                  resultString += sign + padTill2(hours) + sep + padTill2(mins);
                }

                break;

              default:
                resultString += format[i];
                break;
            }

            padding = null;
            isInScope = false;
            continue;
          } // '%'


          if (currentCharCode === 37) {
            isInScope = true;
            continue;
          }

          resultString += format[i];
        }

        return resultString;
      }

      var strftime = _strftime;

      strftime.localize = function (locale) {
        return new Strftime(locale || _locale, _customTimezoneOffset, _useUtcBasedDate);
      };

      strftime.timezone = function (timezone) {
        var customTimezoneOffset = _customTimezoneOffset;
        var useUtcBasedDate = _useUtcBasedDate;
        var timezoneType = typeof timezone;

        if (timezoneType === 'number' || timezoneType === 'string') {
          useUtcBasedDate = true; // ISO 8601 format timezone string, [-+]HHMM

          if (timezoneType === 'string') {
            var sign = timezone[0] === '-' ? -1 : 1,
                hours = parseInt(timezone.slice(1, 3), 10),
                minutes = parseInt(timezone.slice(3, 5), 10);
            customTimezoneOffset = sign * (60 * hours + minutes) * 60 * 1000; // in minutes: 420
          } else if (timezoneType === 'number') {
            customTimezoneOffset = timezone * 60 * 1000;
          }
        }

        return new Strftime(_locale, customTimezoneOffset, useUtcBasedDate);
      };

      strftime.utc = function () {
        return new Strftime(_locale, _customTimezoneOffset, true);
      };

      return strftime;
    }

    function padTill2(numberToPad, paddingChar) {
      if (paddingChar === '' || numberToPad > 9) {
        return numberToPad;
      }

      if (paddingChar == null) {
        paddingChar = '0';
      }

      return paddingChar + numberToPad;
    }

    function padTill3(numberToPad) {
      if (numberToPad > 99) {
        return numberToPad;
      }

      if (numberToPad > 9) {
        return '0' + numberToPad;
      }

      return '00' + numberToPad;
    }

    function hours12(hour) {
      if (hour === 0) {
        return 12;
      } else if (hour > 12) {
        return hour - 12;
      }

      return hour;
    } // firstWeekday: 'sunday' or 'monday', default is 'sunday'
    //
    // Pilfered & ported from Ruby's strftime implementation.


    function weekNumber(date, firstWeekday) {
      firstWeekday = firstWeekday || 'sunday'; // This works by shifting the weekday back by one day if we
      // are treating Monday as the first day of the week.

      var weekday = date.getDay();

      if (firstWeekday === 'monday') {
        if (weekday === 0) // Sunday
          weekday = 6;else weekday--;
      }

      var firstDayOfYearUtc = Date.UTC(date.getFullYear(), 0, 1),
          dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
          yday = Math.floor((dateUtc - firstDayOfYearUtc) / 86400000),
          weekNum = (yday + 7 - weekday) / 7;
      return Math.floor(weekNum);
    } // Get the ordinal suffix for a number: st, nd, rd, or th


    function ordinal(number) {
      var i = number % 10;
      var ii = number % 100;

      if (ii >= 11 && ii <= 13 || i === 0 || i >= 4) {
        return 'th';
      }

      switch (i) {
        case 1:
          return 'st';

        case 2:
          return 'nd';

        case 3:
          return 'rd';
      }
    }

    function getTimestampToUtcOffsetFor(date) {
      return (date.getTimezoneOffset() || 0) * 60000;
    }
  })();
});

var standard_filters = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var HTML_ESCAPE, HTML_ESCAPE_ONCE_REGEXP, HTML_ESCAPE_REGEXP, Iterable, flatten, has, hasOwnProperty, isArguments, isArray, isBlank, isEmpty, isNumber, isString, strftime$$1, toDate, toIterable, toNumber, toObjectString, toString;
    strftime$$1 = strftime;
    Iterable = iterable;
    flatten = helpers.flatten;

    toNumber = function (input) {
      return Number(input);
    };

    toObjectString = Object.prototype.toString;
    hasOwnProperty = Object.prototype.hasOwnProperty;

    isString = function (input) {
      return toObjectString.call(input) === "[object String]";
    };

    isArray = function (input) {
      return Array.isArray(input);
    };

    isArguments = function (input) {
      return toObjectString(input) === "[object Arguments]";
    };

    isNumber = function (input) {
      return !isArray(input) && input - parseFloat(input) >= 0;
    };

    toString = function (input) {
      if (input == null) {
        return "";
      } else if (isString(input)) {
        return input;
      } else if (typeof input.toString === "function") {
        return toString(input.toString());
      } else {
        return toObjectString.call(input);
      }
    };

    toIterable = function (input) {
      return Iterable.cast(input);
    };

    toDate = function (input) {
      if (input == null) {
        return;
      }

      if (input instanceof Date) {
        return input;
      }

      if (input === 'now') {
        return new Date();
      }

      if (isNumber(input)) {
        input = parseInt(input);
      } else {
        input = toString(input);

        if (input.length === 0) {
          return;
        }

        input = Date.parse(input);
      }

      if (input != null) {
        return new Date(input);
      }
    };

    has = function (input, key) {
      return input != null && hasOwnProperty.call(input, key);
    };

    isEmpty = function (input) {
      var key;

      if (input == null) {
        return true;
      }

      if (isArray(input) || isString(input) || isArguments(input)) {
        return input.length === 0;
      }

      for (key in input) {
        if (has(key, input)) {
          return false;
        }
      }

      return true;
    };

    isBlank = function (input) {
      return !(isNumber(input) || input === true) && isEmpty(input);
    };

    HTML_ESCAPE = function (chr) {
      switch (chr) {
        case "&":
          return '&amp;';

        case ">":
          return '&gt;';

        case "<":
          return '&lt;';

        case '"':
          return '&quot;';

        case "'":
          return '&#39;';
      }
    };

    HTML_ESCAPE_ONCE_REGEXP = /["><']|&(?!([a-zA-Z]+|(#\d+));)/g;
    HTML_ESCAPE_REGEXP = /([&><"'])/g;
    module.exports = {
      size: function (input) {
        var ref;
        return (ref = input != null ? input.length : void 0) != null ? ref : 0;
      },
      downcase: function (input) {
        return toString(input).toLowerCase();
      },
      upcase: function (input) {
        return toString(input).toUpperCase();
      },
      append: function (input, suffix) {
        return toString(input) + toString(suffix);
      },
      prepend: function (input, prefix) {
        return toString(prefix) + toString(input);
      },
      empty: function (input) {
        return isEmpty(input);
      },
      capitalize: function (input) {
        return toString(input).replace(/^([a-z])/, function (m, chr) {
          return chr.toUpperCase();
        });
      },
      sort: function (input, property) {
        if (property == null) {
          return toIterable(input).sort();
        }

        return toIterable(input).map(function (item) {
          return Promise.resolve(item != null ? item[property] : void 0).then(function (key) {
            return {
              key: key,
              item: item
            };
          });
        }).then(function (array) {
          return array.sort(function (a, b) {
            var ref, ref1;
            return (ref = a.key > b.key) != null ? ref : {
              1: (ref1 = a.key === b.key) != null ? ref1 : {
                0: -1
              }
            };
          }).map(function (a) {
            return a.item;
          });
        });
      },
      map: function (input, property) {
        if (property == null) {
          return input;
        }

        return toIterable(input).map(function (e) {
          return e != null ? e[property] : void 0;
        });
      },
      escape: function (input) {
        return toString(input).replace(HTML_ESCAPE_REGEXP, HTML_ESCAPE);
      },
      escape_once: function (input) {
        return toString(input).replace(HTML_ESCAPE_ONCE_REGEXP, HTML_ESCAPE);
      },
      strip_html: function (input) {
        return toString(input).replace(/<script[\s\S]*?<\/script>/g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]*?>/g, "");
      },
      strip_newlines: function (input) {
        return toString(input).replace(/\r?\n/g, "");
      },
      newline_to_br: function (input) {
        return toString(input).replace(/\n/g, "<br />\n");
      },
      replace: function (input, string, replacement) {
        if (replacement == null) {
          replacement = "";
        }

        return toString(input).replace(new RegExp(string, 'g'), replacement);
      },
      replace_first: function (input, string, replacement) {
        if (replacement == null) {
          replacement = "";
        }

        return toString(input).replace(string, replacement);
      },
      remove: function (input, string) {
        return this.replace(input, string);
      },
      remove_first: function (input, string) {
        return this.replace_first(input, string);
      },
      truncate: function (input, length, truncateString) {
        var l;

        if (length == null) {
          length = 50;
        }

        if (truncateString == null) {
          truncateString = '...';
        }

        input = toString(input);
        truncateString = toString(truncateString);
        length = toNumber(length);
        l = length - truncateString.length;

        if (l < 0) {
          l = 0;
        }

        if (input.length > length) {
          return input.slice(0, l) + truncateString;
        } else {
          return input;
        }
      },
      truncatewords: function (input, words, truncateString) {
        var wordlist;

        if (words == null) {
          words = 15;
        }

        if (truncateString == null) {
          truncateString = '...';
        }

        input = toString(input);
        wordlist = input.split(" ");
        words = Math.max(1, toNumber(words));

        if (wordlist.length > words) {
          return wordlist.slice(0, words).join(" ") + truncateString;
        } else {
          return input;
        }
      },
      split: function (input, pattern) {
        input = toString(input);

        if (!input) {
          return;
        }

        return input.split(pattern);
      },
      flatten: function (input) {
        return toIterable(input).toArray().then(function (a) {
          return flatten(a);
        });
      },
      join: function (input, glue) {
        if (glue == null) {
          glue = ' ';
        }

        return this.flatten(input).then(function (a) {
          return a.join(glue);
        });
      },
      first: function (input) {
        return toIterable(input).first();
      },
      last: function (input) {
        return toIterable(input).last();
      },
      plus: function (input, operand) {
        return toNumber(input) + toNumber(operand);
      },
      minus: function (input, operand) {
        return toNumber(input) - toNumber(operand);
      },
      times: function (input, operand) {
        return toNumber(input) * toNumber(operand);
      },
      dividedBy: function (input, operand) {
        return toNumber(input) / toNumber(operand);
      },
      divided_by: function (input, operand) {
        return this.dividedBy(input, operand);
      },
      round: function (input, operand) {
        return toNumber(input).toFixed(operand);
      },
      modulo: function (input, operand) {
        return toNumber(input) % toNumber(operand);
      },
      date: function (input, format) {
        input = toDate(input);

        if (input == null) {
          return "";
        } else if (toString(format).length === 0) {
          return input.toUTCString();
        } else {
          return strftime$$1(format, input);
        }
      },
      "default": function (input, defaultValue) {
        var blank, ref;

        if (arguments.length < 2) {
          defaultValue = '';
        }

        blank = (ref = input != null ? typeof input.isBlank === "function" ? input.isBlank() : void 0 : void 0) != null ? ref : isBlank(input);

        if (blank) {
          return defaultValue;
        } else {
          return input;
        }
      }
    };
  }).call(commonjsGlobal);
});
var standard_filters_1 = standard_filters.size;
var standard_filters_2 = standard_filters.downcase;
var standard_filters_3 = standard_filters.upcase;
var standard_filters_4 = standard_filters.append;
var standard_filters_5 = standard_filters.prepend;
var standard_filters_6 = standard_filters.empty;
var standard_filters_7 = standard_filters.capitalize;
var standard_filters_8 = standard_filters.sort;
var standard_filters_9 = standard_filters.map;
var standard_filters_10 = standard_filters.escape_once;
var standard_filters_11 = standard_filters.strip_html;
var standard_filters_12 = standard_filters.strip_newlines;
var standard_filters_13 = standard_filters.newline_to_br;
var standard_filters_14 = standard_filters.replace;
var standard_filters_15 = standard_filters.replace_first;
var standard_filters_16 = standard_filters.remove;
var standard_filters_17 = standard_filters.remove_first;
var standard_filters_18 = standard_filters.truncate;
var standard_filters_19 = standard_filters.truncatewords;
var standard_filters_20 = standard_filters.split;
var standard_filters_21 = standard_filters.flatten;
var standard_filters_22 = standard_filters.join;
var standard_filters_23 = standard_filters.first;
var standard_filters_24 = standard_filters.last;
var standard_filters_25 = standard_filters.plus;
var standard_filters_26 = standard_filters.minus;
var standard_filters_27 = standard_filters.times;
var standard_filters_28 = standard_filters.dividedBy;
var standard_filters_29 = standard_filters.divided_by;
var standard_filters_30 = standard_filters.round;
var standard_filters_31 = standard_filters.modulo;
var standard_filters_32 = standard_filters.date;

var condition = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Condition, Liquid;
    Liquid = liquid;

    module.exports = Condition = function () {
      var LITERALS;
      Condition.operators = {
        '==': function (cond, left, right) {
          return cond.equalVariables(left, right);
        },
        'is': function (cond, left, right) {
          return cond.equalVariables(left, right);
        },
        '!=': function (cond, left, right) {
          return !cond.equalVariables(left, right);
        },
        '<>': function (cond, left, right) {
          return !cond.equalVariables(left, right);
        },
        'isnt': function (cond, left, right) {
          return !cond.equalVariables(left, right);
        },
        '<': function (cond, left, right) {
          return left < right;
        },
        '>': function (cond, left, right) {
          return left > right;
        },
        '<=': function (cond, left, right) {
          return left <= right;
        },
        '>=': function (cond, left, right) {
          return left >= right;
        },
        'contains': function (cond, left, right) {
          return (left != null ? typeof left.indexOf === "function" ? left.indexOf(right) : void 0 : void 0) >= 0;
        }
      };

      function Condition(left1, operator, right1) {
        this.left = left1;
        this.operator = operator;
        this.right = right1;
        this.childRelation = null;
        this.childCondition = null;
      }

      Condition.prototype.evaluate = function (context) {
        var result;

        if (context == null) {
          context = new Liquid.Context();
        }

        result = this.interpretCondition(this.left, this.right, this.operator, context);

        switch (this.childRelation) {
          case "or":
            return Promise.resolve(result).then(function (_this) {
              return function (result) {
                return result || _this.childCondition.evaluate(context);
              };
            }(this));

          case "and":
            return Promise.resolve(result).then(function (_this) {
              return function (result) {
                return result && _this.childCondition.evaluate(context);
              };
            }(this));

          default:
            return result;
        }
      };

      Condition.prototype.or = function (childCondition) {
        this.childCondition = childCondition;
        return this.childRelation = "or";
      };

      Condition.prototype.and = function (childCondition) {
        this.childCondition = childCondition;
        return this.childRelation = "and";
      };

      Condition.prototype.attach = function (attachment) {
        return this.attachment = attachment;
      };

      Condition.prototype.equalVariables = function (left, right) {
        if (typeof left === "function") {
          return left(right);
        } else if (typeof right === "function") {
          return right(left);
        } else {
          return left === right;
        }
      };

      LITERALS = {
        empty: function (v) {
          return !((v != null ? v.length : void 0) > 0);
        },
        blank: function (v) {
          return !v || v.toString().length === 0;
        }
      };

      Condition.prototype.resolveVariable = function (v, context) {
        if (v in LITERALS) {
          return Promise.resolve(LITERALS[v]);
        } else {
          return context.get(v);
        }
      };

      Condition.prototype.interpretCondition = function (left, right, op, context) {
        var operation;

        if (op == null) {
          return this.resolveVariable(left, context);
        }

        operation = Condition.operators[op];

        if (operation == null) {
          throw new Error("Unknown operator " + op);
        }

        left = this.resolveVariable(left, context);
        right = this.resolveVariable(right, context);
        return Promise.all([left, right]).then(function (_this) {
          return function (arg) {
            var left, right;
            left = arg[0], right = arg[1];
            return operation(_this, left, right);
          };
        }(this));
      };

      return Condition;
    }();
  }).call(commonjsGlobal);
});

var else_condition = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var ElseCondition,
        Liquid,
        extend = function (child, parent) {
      for (var key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
      }

      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    },
        hasProp = {}.hasOwnProperty;

    Liquid = liquid;

    module.exports = ElseCondition = function (superClass) {
      extend(ElseCondition, superClass);

      function ElseCondition() {
        return ElseCondition.__super__.constructor.apply(this, arguments);
      }

      ElseCondition.prototype.evaluate = function () {
        return true;
      };

      return ElseCondition;
    }(Liquid.Condition);
  }).call(commonjsGlobal);
});

var blank_file_system = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Liquid;
    Liquid = liquid;

    module.exports = Liquid.BlankFileSystem = function () {
      function BlankFileSystem() {}

      BlankFileSystem.prototype.readTemplateFile = function (templatePath) {
        return Promise.reject(new Liquid.FileSystemError("This file system doesn't allow includes"));
      };

      return BlankFileSystem;
    }();
  }).call(commonjsGlobal);
});

var local_file_system = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Fs,
        Liquid,
        Path,
        readFile,
        extend = function (child, parent) {
      for (var key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
      }

      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    },
        hasProp = {}.hasOwnProperty;

    Liquid = liquid;
    Fs = fs;
    Path = path;

    readFile = function (fpath, encoding) {
      return new Promise(function (resolve, reject) {
        return Fs.readFile(fpath, encoding, function (err, content) {
          if (err) {
            return reject(err);
          } else {
            return resolve(content);
          }
        });
      });
    };

    module.exports = Liquid.LocalFileSystem = function (superClass) {
      var PathPattern;
      extend(LocalFileSystem, superClass);
      PathPattern = /^[^.\/][a-zA-Z0-9-_\/]+$/;

      function LocalFileSystem(root, extension) {
        if (extension == null) {
          extension = "html";
        }

        this.root = root;
        this.fileExtension = extension;
      }

      LocalFileSystem.prototype.readTemplateFile = function (templatePath) {
        return this.fullPath(templatePath).then(function (fullPath) {
          return readFile(fullPath, 'utf8')["catch"](function (err) {
            throw new Liquid.FileSystemError("Error loading template: " + err.message);
          });
        });
      };

      LocalFileSystem.prototype.fullPath = function (templatePath) {
        if (PathPattern.test(templatePath)) {
          return Promise.resolve(Path.resolve(Path.join(this.root, templatePath + ("." + this.fileExtension))));
        } else {
          return Promise.reject(new Liquid.ArgumentError("Illegal template name '" + templatePath + "'"));
        }
      };

      return LocalFileSystem;
    }(Liquid.BlankFileSystem);
  }).call(commonjsGlobal);
});

var assign = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Assign,
        Liquid,
        extend = function (child, parent) {
      for (var key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
      }

      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    },
        hasProp = {}.hasOwnProperty;

    Liquid = liquid;

    module.exports = Assign = function (superClass) {
      var Syntax, SyntaxHelp;
      extend(Assign, superClass);
      SyntaxHelp = "Syntax Error in 'assign' - Valid syntax: assign [var] = [source]";
      Syntax = RegExp("((?:" + Liquid.VariableSignature.source + ")+)\\s*=\\s*(.*)\\s*");

      function Assign(template, tagName, markup) {
        var match;

        if (match = Syntax.exec(markup)) {
          this.to = match[1];
          this.from = new Liquid.Variable(match[2]);
        } else {
          throw new Liquid.SyntaxError(SyntaxHelp);
        }

        Assign.__super__.constructor.apply(this, arguments);
      }

      Assign.prototype.render = function (context) {
        context.lastScope()[this.to] = this.from.render(context);
        return Assign.__super__.render.call(this, context);
      };

      return Assign;
    }(Liquid.Tag);
  }).call(commonjsGlobal);
});

var capture = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Capture,
        Liquid,
        extend = function (child, parent) {
      for (var key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
      }

      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    },
        hasProp = {}.hasOwnProperty;

    Liquid = liquid;

    module.exports = Capture = function (superClass) {
      var Syntax, SyntaxHelp;
      extend(Capture, superClass);
      Syntax = /(\w+)/;
      SyntaxHelp = "Syntax Error in 'capture' - Valid syntax: capture [var]";

      function Capture(template, tagName, markup) {
        var match;
        match = Syntax.exec(markup);

        if (match) {
          this.to = match[1];
        } else {
          throw new Liquid.SyntaxError(SyntaxHelp);
        }

        Capture.__super__.constructor.apply(this, arguments);
      }

      Capture.prototype.render = function (context) {
        return Capture.__super__.render.apply(this, arguments).then(function (_this) {
          return function (chunks) {
            var output;
            output = Liquid.Helpers.toFlatString(chunks);
            context.lastScope()[_this.to] = output;
            return "";
          };
        }(this));
      };

      return Capture;
    }(Liquid.Block);
  }).call(commonjsGlobal);
});

var _case = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Case,
        Liquid,
        PromiseReduce,
        extend = function (child, parent) {
      for (var key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
      }

      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    },
        hasProp = {}.hasOwnProperty;

    Liquid = liquid;
    PromiseReduce = promise_reduce;

    module.exports = Case = function (superClass) {
      var Syntax, SyntaxHelp, WhenSyntax;
      extend(Case, superClass);
      SyntaxHelp = "Syntax Error in tag 'case' - Valid syntax: case [expression]";
      Syntax = RegExp("(" + Liquid.QuotedFragment.source + ")");
      WhenSyntax = RegExp("(" + Liquid.QuotedFragment.source + ")(?:(?:\\s+or\\s+|\\s*\\,\\s*)(" + Liquid.QuotedFragment.source + "))?");

      function Case(template, tagName, markup) {
        var match;
        this.blocks = [];
        match = Syntax.exec(markup);

        if (!match) {
          throw new Liquid.SyntaxError(SyntaxHelp);
        }

        this.markup = markup;

        Case.__super__.constructor.apply(this, arguments);
      }

      Case.prototype.unknownTag = function (tag, markup) {
        if (tag === "when" || tag === "else") {
          return this.pushBlock(tag, markup);
        } else {
          return Case.__super__.unknownTag.apply(this, arguments);
        }
      };

      Case.prototype.render = function (context) {
        return context.stack(function (_this) {
          return function () {
            return PromiseReduce(_this.blocks, function (chosenBlock, block) {
              if (chosenBlock != null) {
                return chosenBlock;
              }

              return Promise.resolve().then(function () {
                return block.evaluate(context);
              }).then(function (ok) {
                if (ok) {
                  return block;
                }
              });
            }, null).then(function (block) {
              if (block != null) {
                return _this.renderAll(block.attachment, context);
              } else {
                return "";
              }
            });
          };
        }(this));
      };

      Case.prototype.pushBlock = function (tag, markup) {
        var block, expressions, i, len, nodelist, ref, results, value;

        if (tag === "else") {
          block = new Liquid.ElseCondition();
          this.blocks.push(block);
          return this.nodelist = block.attach([]);
        } else {
          expressions = Liquid.Helpers.scan(markup, WhenSyntax);
          nodelist = [];
          ref = expressions[0];
          results = [];

          for (i = 0, len = ref.length; i < len; i++) {
            value = ref[i];

            if (value) {
              block = new Liquid.Condition(this.markup, '==', value);
              this.blocks.push(block);
              results.push(this.nodelist = block.attach(nodelist));
            } else {
              results.push(void 0);
            }
          }

          return results;
        }
      };

      return Case;
    }(Liquid.Block);
  }).call(commonjsGlobal);
});

var raw = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Liquid,
        Raw,
        extend = function (child, parent) {
      for (var key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
      }

      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    },
        hasProp = {}.hasOwnProperty;

    Liquid = liquid;

    module.exports = Raw = function (superClass) {
      extend(Raw, superClass);

      function Raw() {
        return Raw.__super__.constructor.apply(this, arguments);
      }

      Raw.prototype.parse = function (tokens) {
        return Promise.resolve().then(function (_this) {
          return function () {
            var match, token;

            if (tokens.length === 0 || _this.ended) {
              return Promise.resolve();
            }

            token = tokens.shift();
            match = Liquid.Block.FullToken.exec(token.value);

            if ((match != null ? match[1] : void 0) === _this.blockDelimiter()) {
              return _this.endTag();
            }

            _this.nodelist.push(token.value);

            return _this.parse(tokens);
          };
        }(this));
      };

      return Raw;
    }(Liquid.Block);
  }).call(commonjsGlobal);
});

var comment = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Comment,
        Raw,
        extend = function (child, parent) {
      for (var key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
      }

      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    },
        hasProp = {}.hasOwnProperty;

    Raw = raw;

    module.exports = Comment = function (superClass) {
      extend(Comment, superClass);

      function Comment() {
        return Comment.__super__.constructor.apply(this, arguments);
      }

      Comment.prototype.render = function () {
        return "";
      };

      return Comment;
    }(Raw);
  }).call(commonjsGlobal);
});

var decrement = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Decrement,
        Liquid,
        extend = function (child, parent) {
      for (var key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
      }

      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    },
        hasProp = {}.hasOwnProperty;

    Liquid = liquid;

    module.exports = Decrement = function (superClass) {
      extend(Decrement, superClass);

      function Decrement(template, tagName, markup) {
        this.variable = markup.trim();

        Decrement.__super__.constructor.apply(this, arguments);
      }

      Decrement.prototype.render = function (context) {
        var base, name, value;
        value = (base = context.environments[0])[name = this.variable] || (base[name] = 0);
        value = value - 1;
        context.environments[0][this.variable] = value;
        return value.toString();
      };

      return Decrement;
    }(Liquid.Tag);
  }).call(commonjsGlobal);
});

var _for = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var For,
        Iterable,
        Liquid,
        PromiseReduce,
        extend = function (child, parent) {
      for (var key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
      }

      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    },
        hasProp = {}.hasOwnProperty;

    Liquid = liquid;
    PromiseReduce = promise_reduce;
    Iterable = iterable;

    module.exports = For = function (superClass) {
      var Syntax, SyntaxHelp;
      extend(For, superClass);
      SyntaxHelp = "Syntax Error in 'for loop' - Valid syntax: for [item] in [collection]";
      Syntax = RegExp("(\\w+)\\s+in\\s+((?:" + Liquid.QuotedFragment.source + ")+)\\s*(reversed)?");

      function For(template, tagName, markup) {
        var match;
        match = Syntax.exec(markup);

        if (match) {
          this.variableName = match[1];
          this.collectionName = match[2];
          this.registerName = match[1] + "=" + match[2];
          this.reversed = match[3];
          this.attributes = {};
          Liquid.Helpers.scan(markup, Liquid.TagAttributes).forEach(function (_this) {
            return function (attr) {
              return _this.attributes[attr[0]] = attr[1];
            };
          }(this));
        } else {
          throw new Liquid.SyntaxError(SyntaxHelp);
        }

        this.nodelist = this.forBlock = [];

        For.__super__.constructor.apply(this, arguments);
      }

      For.prototype.unknownTag = function (tag, markup) {
        if (tag !== "else") {
          return For.__super__.unknownTag.apply(this, arguments);
        }

        return this.nodelist = this.elseBlock = [];
      };

      For.prototype.render = function (context) {
        var base;
        (base = context.registers)["for"] || (base["for"] = {});
        return Promise.resolve(context.get(this.collectionName)).then(function (_this) {
          return function (collection) {
            var from, k, limit, to, v;

            if (collection != null ? collection.forEach : void 0) ; else if (collection instanceof Object) {
              collection = function () {
                var results;
                results = [];

                for (k in collection) {
                  if (!hasProp.call(collection, k)) continue;
                  v = collection[k];
                  results.push([k, v]);
                }

                return results;
              }();
            } else {
              return _this.renderElse(context);
            }

            from = _this.attributes.offset === "continue" ? Number(context.registers["for"][_this.registerName]) || 0 : Number(_this.attributes.offset) || 0;
            limit = _this.attributes.limit;
            to = limit ? Number(limit) + from : null;
            return _this.sliceCollection(collection, from, to).then(function (segment) {
              var length;

              if (segment.length === 0) {
                return _this.renderElse(context);
              }

              if (_this.reversed) {
                segment.reverse();
              }

              length = segment.length;
              context.registers["for"][_this.registerName] = from + segment.length;
              return context.stack(function () {
                return PromiseReduce(segment, function (output, item, index) {
                  context.set(_this.variableName, item);
                  context.set("forloop", {
                    name: _this.registerName,
                    length: length,
                    index: index + 1,
                    index0: index,
                    rindex: length - index,
                    rindex0: length - index - 1,
                    first: index === 0,
                    last: index === length - 1
                  });
                  return Promise.resolve().then(function () {
                    return _this.renderAll(_this.forBlock, context);
                  }).then(function (rendered) {
                    output.push(rendered);
                    return output;
                  })["catch"](function (e) {
                    output.push(context.handleError(e));
                    return output;
                  });
                }, []);
              });
            });
          };
        }(this));
      };

      For.prototype.sliceCollection = function (collection, from, to) {
        var args, ref;
        args = [from];

        if (to != null) {
          args.push(to);
        }

        return (ref = Iterable.cast(collection)).slice.apply(ref, args);
      };

      For.prototype.renderElse = function (context) {
        if (this.elseBlock) {
          return this.renderAll(this.elseBlock, context);
        } else {
          return "";
        }
      };

      return For;
    }(Liquid.Block);
  }).call(commonjsGlobal);
});

var _if = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var If,
        Liquid,
        PromiseReduce,
        extend = function (child, parent) {
      for (var key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
      }

      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    },
        hasProp = {}.hasOwnProperty;

    Liquid = liquid;
    PromiseReduce = promise_reduce;

    module.exports = If = function (superClass) {
      var ExpressionsAndOperators, Syntax, SyntaxHelp;
      extend(If, superClass);
      SyntaxHelp = "Syntax Error in tag 'if' - Valid syntax: if [expression]";
      Syntax = RegExp("(" + Liquid.QuotedFragment.source + ")\\s*([=!<>a-z_]+)?\\s*(" + Liquid.QuotedFragment.source + ")?");
      ExpressionsAndOperators = RegExp("(?:\\b(?:\\s?and\\s?|\\s?or\\s?)\\b|(?:\\s*(?!\\b(?:\\s?and\\s?|\\s?or\\s?)\\b)(?:" + Liquid.QuotedFragment.source + "|\\S+)\\s*)+)");

      function If(template, tagName, markup) {
        this.blocks = [];
        this.pushBlock('if', markup);

        If.__super__.constructor.apply(this, arguments);
      }

      If.prototype.unknownTag = function (tag, markup) {
        if (tag === "elsif" || tag === "else") {
          return this.pushBlock(tag, markup);
        } else {
          return If.__super__.unknownTag.apply(this, arguments);
        }
      };

      If.prototype.render = function (context) {
        return context.stack(function (_this) {
          return function () {
            return PromiseReduce(_this.blocks, function (chosenBlock, block) {
              if (chosenBlock != null) {
                return chosenBlock;
              }

              return Promise.resolve().then(function () {
                return block.evaluate(context);
              }).then(function (ok) {
                if (block.negate) {
                  ok = !ok;
                }

                if (ok) {
                  return block;
                }
              });
            }, null).then(function (block) {
              if (block != null) {
                return _this.renderAll(block.attachment, context);
              } else {
                return "";
              }
            });
          };
        }(this));
      };

      If.prototype.pushBlock = function (tag, markup) {
        var block, condition, expressions, match, newCondition, operator;

        block = function () {
          if (tag === "else") {
            return new Liquid.ElseCondition();
          } else {
            expressions = Liquid.Helpers.scan(markup, ExpressionsAndOperators);
            expressions = expressions.reverse();
            match = Syntax.exec(expressions.shift());

            if (!match) {
              throw new Liquid.SyntaxError(SyntaxHelp);
            }

            condition = function (func, args, ctor) {
              ctor.prototype = func.prototype;
              var child = new ctor(),
                  result = func.apply(child, args);
              return Object(result) === result ? result : child;
            }(Liquid.Condition, match.slice(1, 4), function () {});

            while (expressions.length > 0) {
              operator = String(expressions.shift()).trim();
              match = Syntax.exec(expressions.shift());

              if (!match) {
                throw new SyntaxError(SyntaxHelp);
              }

              newCondition = function (func, args, ctor) {
                ctor.prototype = func.prototype;
                var child = new ctor(),
                    result = func.apply(child, args);
                return Object(result) === result ? result : child;
              }(Liquid.Condition, match.slice(1, 4), function () {});

              newCondition[operator].call(newCondition, condition);
              condition = newCondition;
            }

            return condition;
          }
        }();

        this.blocks.push(block);
        return this.nodelist = block.attach([]);
      };

      return If;
    }(Liquid.Block);
  }).call(commonjsGlobal);
});

var ifchanged = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var IfChanged,
        Liquid,
        extend = function (child, parent) {
      for (var key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
      }

      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    },
        hasProp = {}.hasOwnProperty;

    Liquid = liquid;

    module.exports = IfChanged = function (superClass) {
      extend(IfChanged, superClass);

      function IfChanged() {
        return IfChanged.__super__.constructor.apply(this, arguments);
      }

      IfChanged.prototype.render = function (context) {
        return context.stack(function (_this) {
          return function () {
            var rendered;
            rendered = _this.renderAll(_this.nodelist, context);
            return Promise.resolve(rendered).then(function (output) {
              output = Liquid.Helpers.toFlatString(output);

              if (output !== context.registers.ifchanged) {
                return context.registers.ifchanged = output;
              } else {
                return "";
              }
            });
          };
        }(this));
      };

      return IfChanged;
    }(Liquid.Block);
  }).call(commonjsGlobal);
});

var increment = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Increment,
        Liquid,
        extend = function (child, parent) {
      for (var key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
      }

      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    },
        hasProp = {}.hasOwnProperty;

    Liquid = liquid;

    module.exports = Increment = function (superClass) {
      extend(Increment, superClass);

      function Increment(template, tagName, markup) {
        this.variable = markup.trim();

        Increment.__super__.constructor.apply(this, arguments);
      }

      Increment.prototype.render = function (context) {
        var base, name, value;
        value = (base = context.environments[0])[name = this.variable] != null ? base[name] : base[name] = 0;
        context.environments[0][this.variable] = value + 1;
        return String(value);
      };

      return Increment;
    }(Liquid.Tag);
  }).call(commonjsGlobal);
});

var unless = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Liquid,
        Unless,
        extend = function (child, parent) {
      for (var key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
      }

      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    },
        hasProp = {}.hasOwnProperty;

    Liquid = liquid;

    module.exports = Unless = function (superClass) {
      extend(Unless, superClass);

      function Unless() {
        return Unless.__super__.constructor.apply(this, arguments);
      }

      Unless.prototype.parse = function () {
        return Unless.__super__.parse.apply(this, arguments).then(function (_this) {
          return function () {
            return _this.blocks[0].negate = true;
          };
        }(this));
      };

      return Unless;
    }(Liquid.If);
  }).call(commonjsGlobal);
});

var include = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Include,
        Liquid,
        extend = function (child, parent) {
      for (var key in parent) {
        if (hasProp.call(parent, key)) child[key] = parent[key];
      }

      function ctor() {
        this.constructor = child;
      }

      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
      child.__super__ = parent.prototype;
      return child;
    },
        hasProp = {}.hasOwnProperty;

    Liquid = liquid;

    module.exports = Include = function (superClass) {
      var Syntax, SyntaxHelp;
      extend(Include, superClass);
      Syntax = /([a-z0-9\/\\_-]+)/i;
      SyntaxHelp = "Syntax Error in 'include' - Valid syntax: include [templateName]";

      function Include(template, tagName, markup, tokens) {
        var match;
        match = Syntax.exec(markup);

        if (!match) {
          throw new Liquid.SyntaxError(SyntaxHelp);
        }

        this.filepath = match[1];
        this.subTemplate = template.engine.fileSystem.readTemplateFile(this.filepath).then(function (src) {
          return template.engine.parse(src);
        });

        Include.__super__.constructor.apply(this, arguments);
      }

      Include.prototype.render = function (context) {
        return this.subTemplate.then(function (i) {
          return i.render(context);
        });
      };

      return Include;
    }(Liquid.Tag);
  }).call(commonjsGlobal);
});

var lib$1 = createCommonjsModule(function (module) {
  // Generated by CoffeeScript 1.10.0
  (function () {
    var Liquid, customError, util$$1;
    Liquid = liquid;
    util$$1 = util;

    customError = function (name, inherit) {
      var error;

      if (inherit == null) {
        inherit = commonjsGlobal.Error;
      }

      error = function (message) {
        this.name = name;
        this.message = message;

        if (commonjsGlobal.Error.captureStackTrace) {
          return commonjsGlobal.Error.captureStackTrace(this, arguments.callee);
        }
      };

      util$$1.inherits(error, inherit);
      return error;
    };

    Liquid.Error = customError("Error");
    ["ArgumentError", "ContextError", "FilterNotFound", "FileSystemError", "StandardError", "StackLevelError", "SyntaxError"].forEach(function (className) {
      return Liquid[className] = customError("Liquid." + className, Liquid.Error);
    });
    Liquid.Engine = engine;
    Liquid.Helpers = helpers;
    Liquid.Range = range;
    Liquid.Iterable = iterable;
    Liquid.Drop = drop;
    Liquid.Context = context;
    Liquid.Tag = tag;
    Liquid.Block = block;
    Liquid.Document = document$1;
    Liquid.Variable = variable;
    Liquid.Template = template;
    Liquid.StandardFilters = standard_filters;
    Liquid.Condition = condition;
    Liquid.ElseCondition = else_condition;
    Liquid.BlankFileSystem = blank_file_system;
    Liquid.LocalFileSystem = local_file_system;
    Liquid.Assign = assign;
    Liquid.Capture = capture;
    Liquid.Case = _case;
    Liquid.Comment = comment;
    Liquid.Decrement = decrement;
    Liquid.For = _for;
    Liquid.If = _if;
    Liquid.Ifchanged = ifchanged;
    Liquid.Increment = increment;
    Liquid.Raw = raw;
    Liquid.Unless = unless;
    Liquid.Include = include;
    module.exports = Liquid;
  }).call(commonjsGlobal);
});

class Generator {
  constructor(type, config, coreConfig) {
    this.type = type;
    this.config = config;
    this.coreConfig = coreConfig;
    this.templates = {};
    this.engine = new lib$1.Engine(); // this.ensureTemplateDirExists();
  }

  get templatesDir() {
    return path.join(process.cwd(), this.coreConfig.templatesDir, this.config.templateSubDir);
  }

  get templateFilenames() {
    return Object.keys(this.config.templates);
  }

  outputDir(subDir) {
    return path.join(process.cwd(), this.coreConfig.outputBaseDir, subDir);
  }

  ensureTemplateDirExists() {
    if (!fs.existsSync(this.templatesDir)) {
      console.log(" ERROR: The template directory \"".concat(this.templatesDir, "\" for the generator \"").concat(this.type, "\" does not exist. Check the config file's \"templatesDir\" and \"templateSubDir\" properties.\n"));
      process.exit();
    }
  }

  ensureOutputDirExists(subDir) {
    mkdirp.sync(subDir);
  }
  /**
   * Generate and save all templates for the given instance name.
   * @param  {String} instanceName [description]
   * @return {Promise}              [description]
   */


  generate(instanceName) {
    // Load the templates
    return Promise.all(this.templateFilenames.map(templateFileName => this.loadTemplateOnce(templateFileName).then(t => {
      let data = {
        'INSTANCE_NAME': instanceName
      };
      return Promise.all([this.renderTemplate(t.contents, data), this.renderTemplate(t.outputSubdir, data), this.renderTemplate(t.outputFilename, data)]).then(arr => {
        let [html, outputSubdir, outputFilename] = arr;
        return this.writeTemplate(outputFilename, outputSubdir, html);
      });
    })));
  }
  /**
   * Load a template object into this.templates, including its parsed contents and output filename.
   *
   * @param  {String} templateFilename The filename of the original template file.
   * @return {Promise}                  Resolves to the JSON object for this template inside this.templates.
   */


  loadTemplateOnce(templateFilename) {
    if (this.templates[templateFilename]) {
      return Promise.resolve(this.templates[templateFilename]);
    } // Get the unparsed raw templates.


    let rawContentTemplate = fs.readFileSync("".concat(this.templatesDir, "/").concat(templateFilename), 'utf8');
    let rawOutputSubdirTemplate = this.config.outputSubDir;
    let rawOutfileTemplate = this.config.templates[templateFilename]; // Parse them both

    return Promise.all([this.engine.parse(rawContentTemplate), this.engine.parse(rawOutputSubdirTemplate), this.engine.parse(rawOutfileTemplate)]) // Save them into the templates object, and return it.
    .then(arr => {
      let [contents, outputSubdir, outputFilename] = arr;
      this.templates[templateFilename] = {
        contents,
        outputSubdir,
        outputFilename
      };
      return Promise.resolve(this.templates[templateFilename]);
    });
  }
  /**
   * Call the template rendering function.
   * @param  {Function} template [description]
   * @param  {Object} data     [description]
   * @return {Promise}          [description]
   */


  renderTemplate(template, data) {
    return template.render(data);
  }
  /**
   * Write the contents to a file asyncronously.
   *
   * @param  {String} fileName The output filename.
   * @param  {String} subDir   The subdirectory of the generator's root directory.
   * @param  {String} contents The rendered file contents.
   * @return {Promise}          A Promise resolving to true.
   */


  writeTemplate(fileName, subDir, contents) {
    subDir = this.outputDir(subDir);
    this.ensureOutputDirExists(subDir);
    let filePath = path.join(subDir, fileName);
    fs.writeFileSync(filePath, contents, 'utf8');
    return Promise.resolve(true);
  }

}

class GeneratorManifest {
  constructor(config) {
    this._generators = {};
    this._core = new Core();
    Object.keys(config.generators).forEach(name => {
      let g = config.generators[name];
      this._generators[name] = new Generator(name, g, config);
    });
  }

  get generators() {
    return this._generators;
  }

  get generatorNames() {
    return Object.keys(this._generators);
  }

  generatorIsRegistered(name) {
    return Object.keys(this._generators).includes(name);
  }

  getGenerator(name) {
    return this._generators[name];
  }

}

const heading = "\n\n\n--------------------------------------\n          BYOBoilerplate\n--------------------------------------\n";
const configFileAlreadyExists = "  ...config file already exists in ".concat(Constants$2.CONFIG_FILE_PATH, ". Either edit it directly, or delete it to generate from scratch. ");
const templateDirectoryAlreadyExists = "  ...template directory ".concat(Constants$2.TEMPLATE_FILE_PATH, " already exists. Either edit it directly, or delete it to generate from scratch. ");
const usage = "\n".concat(heading, "\n\n  Usage:\n    # Install default config file\n    bgen init\n\n    # Run a configured generator\n    bgen thingType ThingName\n\n  Examples:\n\n    bgen view MyView\n    bgen component MyComponent\n\n");
const initRequirement = "\n".concat(heading, "\n\n  You must create a config file before running the generators.\n\n  Usage:\n    # Install default config file\n    bgen init\n");

class Core {
  constructor() {
    this._config = null;
  }

  get config() {
    if (!this._config) {
      this._config = this.loadConfig();
    }

    return this._config;
  }

  get manifest() {
    if (!this._manifest) {
      this._manifest = new GeneratorManifest(this.config);
    }

    return this._manifest;
  }

  static configFileExists() {
    return lib.existsSync(Constants$2.CONFIG_FILE_PATH);
  }

  static createConfig() {
    let src = path.join(global.__cwd, 'node_modules', 'byoboilerplate', Constants$2.CONFIG_FILE_NAME);
    let dest = path.join(global.__cwd, Constants$2.CONFIG_FILE_NAME);
    console.log("  ...copying config file ".concat(src, " to ").concat(dest, "..."));
    lib.copyFileSync(src, dest);
    console.log("  ...done.\n\n");
  }

  static copyTemplates() {
    let src = path.join(global.__cwd, 'node_modules', 'byoboilerplate', Constants$2.TEMPLATE_DIR_PATH);
    let dest = path.join(global.__cwd, Constants$2.TEMPLATE_DIR_PATH);
    console.log("  ...copying templates from ".concat(src, " to ").concat(dest, "..."));
    lib.copySync(src, dest);
    console.log("  ...done.\n\n");
  }

  loadConfig() {
    return JSON.parse(lib.readFileSync(Constants$2.CONFIG_FILE_PATH));
  }

  static printAvailableGenerators(generators) {
    const names = Object.values(generators).map(g => g.type).join("\n    ");
    const output = "\n  Available generators:\n\n    ".concat(names, "\n\n\n\n        ");
    console.log(output);
  }

  static printConfigFileAlreadyExists() {
    console.log(configFileAlreadyExists);
  }

  static printTemplateDirectoryAlreadyExists() {
    console.log(templateDirectoryAlreadyExists);
  }

  static printHeading() {
    console.log(heading);
  }

  static printInitRequirement() {
    console.log(initRequirement);
  }

  static printUsage() {
    console.log(usage);
  }

  static templateDirectoryExists() {
    return lib.existsSync(Constants$2.TEMPLATE_DIR_PATH);
  }

}

const Commands = {
  init: () => {
    Core.printHeading();
    console.log("  ...initializing ".concat(Constants.CONFIG_FILE_PATH, " with default generators..."));

    if (Core.configFileExists()) {
      Core.printConfigFileAlreadyExists();
      process.exit();
    }

    Core.createConfig();
    console.log("  ...initializing ".concat(Constants.TEMPLATE_DIR_PATH, " with default generators..."));

    if (Core.templateDirectoryExists()) {
      Core.printTemplateDirectoryAlreadyExists();
      process.exit();
    }

    Core.copyTemplates();
    console.log('  ...everything done.\n');
  },
  list: () => {
    Core.printHeading();
    let core = new Core();
    console.log('  Available generators: \n');
    core.manifest.generatorNames.forEach(g => {
      console.log('  *', g);
    });
    console.log('\n');
  },
  generate: (manifest, generatorName, instanceName) => {
    // TODO: write generatorIsValid method which checks config properties.
    if (!manifest.generatorIsRegistered(generatorName)) {
      throw "The generator \"".concat(generatorName, "\" is not registered.");
    }

    manifest.getGenerator(generatorName).generate(instanceName);
  }
};

global.__dirname = path.resolve(__dirname);
global.__cwd = process.cwd();
let rawArgs = process.argv.slice(2);
let argv = minimist(rawArgs);

switch (argv._[0]) {
  case 'init':
    if (Core.templateDirectoryExists()) {
      Core.printTemplateDirectoryAlreadyExists();
      process.exit();
    }

    Commands.init();
    break;

  case 'list':
    if (!Core.configFileExists()) {
      Core.printInitRequirement();
      process.exit();
    }

    Commands.list();
    break;

  default:
    const core = new Core(); // Verify other arguments.

    if (rawArgs.length < 2) {
      Core.printUsage();
      process.exit();
    }

    if (!Core.configFileExists()) {
      Core.printInitRequirement();
      process.exit();
    }

    Commands.generate(core.manifest, argv._[0], argv._[1]);
    break;
}
