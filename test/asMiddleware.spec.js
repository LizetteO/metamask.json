/* eslint-env mocha */
'use strict';

const { strict: assert } = require('assert');
const { JsonRpcEngine } = require('../dist');

describe('asMiddleware', function () {
  it('basic', function (done) {
    const engine = new JsonRpcEngine();
    const subengine = new JsonRpcEngine();
    let originalReq;

    subengine.push(function (req, res, _next, end) {
      originalReq = req;
      res.result = 'saw subengine';
      end();
    });

    engine.push(subengine.asMiddleware());

    const payload = { id: 1, jsonrpc: '2.0', method: 'hello' };

    engine.handle(payload, function (err, res) {
      assert.ifError(err, 'did not error');
      assert.ok(res, 'has res');
      assert.equal(originalReq.id, res.id, 'id matches');
      assert.equal(originalReq.jsonrpc, res.jsonrpc, 'jsonrpc version matches');
      assert.equal(res.result, 'saw subengine', 'response was handled by nested engine');
      done();
    });
  });

  it('decorate res', function (done) {
    const engine = new JsonRpcEngine();
    const subengine = new JsonRpcEngine();
    let originalReq;

    subengine.push(function (req, res, _next, end) {
      originalReq = req;
      res.xyz = true;
      res.result = true;
      end();
    });

    engine.push(subengine.asMiddleware());

    const payload = { id: 1, jsonrpc: '2.0', method: 'hello' };

    engine.handle(payload, function (err, res) {
      assert.ifError(err, 'did not error');
      assert.ok(res, 'has res');
      assert.equal(originalReq.id, res.id, 'id matches');
      assert.equal(originalReq.jsonrpc, res.jsonrpc, 'jsonrpc version matches');
      assert.ok(res.xyz, 'res non-result prop was transfered');
      done();
    });
  });

  it('decorate req', function (done) {
    const engine = new JsonRpcEngine();
    const subengine = new JsonRpcEngine();
    let originalReq;

    subengine.push(function (req, res, _next, end) {
      originalReq = req;
      req.xyz = true;
      res.result = true;
      end();
    });

    engine.push(subengine.asMiddleware());

    const payload = { id: 1, jsonrpc: '2.0', method: 'hello' };

    engine.handle(payload, function (err, res) {
      assert.ifError(err, 'did not error');
      assert.ok(res, 'has res');
      assert.equal(originalReq.id, res.id, 'id matches');
      assert.equal(originalReq.jsonrpc, res.jsonrpc, 'jsonrpc version matches');
      assert.ok(originalReq.xyz, 'req prop was transfered');
      done();
    });
  });

  it('should not error even if end not called', function (done) {
    const engine = new JsonRpcEngine();
    const subengine = new JsonRpcEngine();

    subengine.push((_req, _res, next, _end) => next());

    engine.push(subengine.asMiddleware());
    engine.push((_req, res, _next, end) => {
      res.result = true;
      end();
    });

    const payload = { id: 1, jsonrpc: '2.0', method: 'hello' };

    engine.handle(payload, function (err, res) {
      assert.ifError(err, 'did not error');
      assert.ok(res, 'has res');
      done();
    });
  });

  it('handles next handler correctly when nested', function (done) {
    const engine = new JsonRpcEngine();
    const subengine = new JsonRpcEngine();

    subengine.push((_req, res, next, _end) => {
      next(() => {
        res.copy = res.result;
      });
    });

    engine.push(subengine.asMiddleware());
    engine.push((_req, res, _next, end) => {
      res.result = true;
      end();
    });
    const payload = { id: 1, jsonrpc: '2.0', method: 'hello' };

    engine.handle(payload, function (err, res) {
      assert.ifError(err, 'did not error');
      assert.ok(res, 'has res');
      assert.equal(res.result, res.copy, 'copied result correctly');
      done();
    });
  });

  it('handles next handler correctly when flat', function (done) {
    const engine = new JsonRpcEngine();
    const subengine = new JsonRpcEngine();

    subengine.push((_req, res, next, _end) => {
      next(() => {
        res.copy = res.result;
      });
    });

    subengine.push((_req, res, _next, end) => {
      res.result = true;
      end();
    });

    engine.push(subengine.asMiddleware());
    const payload = { id: 1, jsonrpc: '2.0', method: 'hello' };

    engine.handle(payload, function (err, res) {
      assert.ifError(err, 'did not error');
      assert.ok(res, 'has res');
      assert.equal(res.result, res.copy, 'copied result correctly');
      done();
    });
  });

  it('handles error thrown in middleware', function (done) {
    const engine = new JsonRpcEngine();
    const subengine = new JsonRpcEngine();

    subengine.push(function (_req, _res, _next, _end) {
      throw new Error('foo');
    });

    engine.push(subengine.asMiddleware());

    const payload = { id: 1, jsonrpc: '2.0', method: 'hello' };

    engine.handle(payload, function (err, res) {
      assert.ok(err, 'should have errored');
      assert.equal(err.message, 'foo', 'should have expected error');
      assert.ifError(res.result, 'should not have result');
      done();
    });
  });

  it('handles next handler error correctly when nested', function (done) {
    const engine = new JsonRpcEngine();
    const subengine = new JsonRpcEngine();

    subengine.push((_req, _res, next, _end) => {
      next(() => {
        throw new Error('foo');
      });
    });

    engine.push(subengine.asMiddleware());
    engine.push((_req, res, _next, end) => {
      res.result = true;
      end();
    });
    const payload = { id: 1, jsonrpc: '2.0', method: 'hello' };

    engine.handle(payload, function (err, res) {
      assert.ok(err, 'should have errored');
      assert.equal(err.message, 'foo', 'should have expected error');
      assert.ifError(res.result, 'should not have result');
      done();
    });
  });

  it('handles next handler error correctly when flat', function (done) {
    const engine = new JsonRpcEngine();
    const subengine = new JsonRpcEngine();

    subengine.push((_req, _res, next, _end) => {
      next(() => {
        throw new Error('foo');
      });
    });

    subengine.push((_req, res, _next, end) => {
      res.result = true;
      end();
    });

    engine.push(subengine.asMiddleware());
    const payload = { id: 1, jsonrpc: '2.0', method: 'hello' };

    engine.handle(payload, function (err, res) {
      assert.ok(err, 'should have errored');
      assert.equal(err.message, 'foo', 'should have expected error');
      assert.ifError(res.result, 'should not have result');
      done();
    });
  });

});
