/*!
 * Connect - Session Rest API
 * It implements express session store using Restful API
 * Copyright(c) 2016 Vijay Yadav <vijayyadav1002@gmail.com>
 *
 * MIT Licensed
 *
 * This is an adaption from connect-redis, see:
 * https://github.com/visionmedia/connect-redis
 */

'use strict';

/**
 * Module dependencies.
 */

var http = require('http');
var https = require('https');
var get = require('lodash/get');
var has = require('lodash/has');
var includes = require('lodash/includes');
var debug = require('debug');
var info = debug('connect-cache-utility:info');
var error = debug('connect-cache-utility:error');

/**
 * Constants
 */
var ERROR = 'ERROR';
var PUT = 'PUT';
var DELETE = 'DELETE';
var GET = 'GET';

/**
 * No op
 */
var noop = function () {
};

/**
 * Return the `RestfulStore` extending `express`'s session Store.
 *
 * @param {object} session
 * @return {Function}
 * @api public
 */

module.exports = function (session) {

    /**
     * Express's session Store.
     */

    var Store = session.Store;

    /**
     * Initialize RestfulStore with the given `options`.
     *
     * @param {Object} options
     * @api public
     */

    function RestfulStore(options) {
        options = options || {};
        Store.call(this);
        this.prefix = null == options.PREFIX
            ? 'sess:'
            : options.PREFIX;

        var connectOptions = {};
        this.client = {};
        this.client.httpClient = get(options, 'SECURE', false) ? https : http;
        if (has(options, 'PROTOCOL')) {
            connectOptions.protocol = options.PROTOCOL;
        }
        if (has(options, 'HOSTNAME')) {
            connectOptions.hostname = options.HOSTNAME;
        }
        if (has(options, 'PORT')) {
            connectOptions.port = options.PORT;
        }
        if (has(options, 'PATH')) {
            connectOptions.path = options.PATH;
        }

        this.ttl = options.TTL || null;
        this.client.connectOptions = connectOptions;
    }

    /**
     * Handles response object from the server
     *
     * @param {Object} res
     * @param {Function} fn
     * @api private
     */

    function handleCallback(res, fn) {
        var data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            var result;
            try {
                result = JSON.parse(data);
                if (get(result, 'Result.ResultCode') === ERROR) {
                    return fn();
                }
            } catch (err) {
                return fn(err)
            }
            return fn(null, result);
        })
    }

    /**
     * make request to server
     *
     * @param {Object} requestOptions
     * @api private
     */

    function makeRequest(requestOptions) {
        var fn = requestOptions.fn;
        if ('function' !== typeof fn) {
            fn = noop;
        }
        var sid = this.prefix + requestOptions.sid;
        if (this.ttl && requestOptions.method === PUT) {
            sid += '?ttl=' + this.ttl;
        }
        var connectOptions = this.client.connectOptions;
        var options = {
            protocol: connectOptions.protocol,
            hostname: connectOptions.hostname,
            port: connectOptions.port,
            path: connectOptions.path + sid,
            method: get(requestOptions, 'method', GET),
            headers: {
                'Content-Type': 'application/json'
            }
        };
        var req = this.client.httpClient.request(options, (res) => {
            handleCallback(res, fn);
        });
        req.on('error', (err) => {
            return fn(err);
        });
        if (requestOptions.method === PUT) {
            req.write(JSON.stringify(requestOptions.sess));
        }
        req.end();
    }

    /**
     * Inherit from `Store`.
     */

    RestfulStore.prototype.__proto__ = Store.prototype;

    /**
     * Attempt to fetch session by the given `sid`.
     *
     * @param {String} sid
     * @param {Function} fn
     * @api public
     */

    RestfulStore.prototype.get = function (sid, fn) {
        makeRequest.call(this, {
            method: GET,
            sid: sid,
            fn: fn
        });
    };

    /**
     * Commit the given `sess` object associated with the given `sid`.
     *
     * @param {String} sid
     * @param {Session} sess
     * @param {Function} fn
     * @api public
     */

    RestfulStore.prototype.set = function (sid, sess, fn) {
        makeRequest.call(this, {
            method: PUT,
            sid: sid,
            sess: sess,
            fn: fn
        });
    };

    /**
     * Destroy the session associated with the given `sid`.
     *
     * @param {String} sid
     * @param {Function} fn
     * @api public
     */

    RestfulStore.prototype.destroy = function (sid, fn) {
        makeRequest.call(this, {
            method: DELETE,
            sid: sid,
            fn: fn
        });
    };


    /**
     * Refresh the time-to-live for the session with the given `sid`.
     *
     * @param {String} sid
     * @param {Session} sess
     * @param {Function} fn
     * @api public
     */

    RestfulStore.prototype.touch = function (sid, sess, fn) {
        this.set.call(this, sid, sess, fn);
    };

    return RestfulStore;
};
