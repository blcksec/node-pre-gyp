
module.exports = exports = package

exports.usage = 'Publishes pre-built binary'

var fs = require('fs')
  , path = require('path')
  , log = require('npmlog')
  , versioning = require('./util/versioning.js')
  , compile = require('./util/compile.js')
  , write = require('fs').createWriteStream
  , pack = require('tar-pack').pack
  , mkdirp = require('mkdirp');

function package(gyp, argv, callback) {
    // @TODO - respect -C/--directory
    var package_json = JSON.parse(fs.readFileSync('./package.json'));
    var command_line_opts = (typeof(gyp.opts.argv.original) === 'string') ? JSON.parse(gyp.opts.argv).original : gyp.opts.argv.original || [];
    command_line_opts = command_line_opts.filter(function(opt) { return opt.length > 2 && opt.slice(0,2) == '--'});
    var node_gyp_args = ['rebuild'].concat(command_line_opts);
    versioning.evaluate(package_json, gyp.opts, function(err,opts) {
        if (err) return callback(err);
        compile.run_gyp(node_gyp_args,opts,function(err,opts) {
            if (err) return callback(err);
            var staging = path.join('stage',opts.versioned);
            var basedir = path.basename(package_json.binary.module_path);
            var filter_func = function (entry) {
                return ((entry.type == 'Directory' && entry.basename == basedir) ||
                        path.extname(entry.basename) == '.node');
            }
            mkdirp(path.dirname(staging),function(err) {
                pack(package_json.binary.module_path, { filter: filter_func })
                 .pipe(write(staging))
                 .on('error', function (err) {
                    return callback(err);
                 })
                 .on('close', function () {
                    log.info('install','Binary staged at "' + staging + '"');
                    return callback();
                 })
            });
        })
    });
}