'use strict';

//import * as acorn from './../src/babelsberg/jsinterpreter/acorn.js'
import Interpreter from '../../src/babelsberg/jsinterpreter/interpreter.js'
import { aexpr } from '../../src/interpretation/interpretation-active-expressions.js';

import './set-global-state.fixture.js';

describe('Interpreting Active Expressions', function() {
    it("should interpret", () => {
        var predicate = function () {
            return 23;
        };
        var i = new Interpreter(`var returnValue = (${predicate.toString()})();`);
        i.run();
        assert.equal(23, i.stateStack[0].scope.properties.returnValue);
        expect(i.stateStack[0].scope.properties.returnValue.data).to.equal(23);
    });

    it("runs a basic aexpr", () => {
        var obj = {a: 2, b: 3};
        let spy = sinon.spy();

        aexpr(function() {
            return obj.a;
        }, locals).onChange(spy);

        expect(spy.called).to.be.false;

        obj.a = 42;

        expect(spy.calledOnce).to.be.true;
    });

    it("should handle simple a calculation", () => {
        var obj = {a: 2, b: 3};
        let spy = sinon.spy();
        function predicate() {
            return obj.a + obj.b;
        }

        aexpr(predicate, locals)
            .onChange(spy);

        obj.a = 42;

        expect(spy.calledOnce).to.be.true;

        obj.b = 17;

        expect(spy.calledTwice).to.be.true;
    });

    it("should not invoke the callback if assigning the same value", () => {
        var obj = {a: 0, b: 3};
        let spy = sinon.spy();
        function predicate() {
            return obj.a * obj.b;
        }

        aexpr(predicate, locals)
            .onChange(spy);

        obj.b = 5;

        expect(spy.called).to.be.false;

        obj.a = 17;

        expect(spy.calledOnce).to.be.true;
    });

    it("invokes multiple callbacks", () => {
        var obj = {a: 1};
        let spy1 = sinon.spy(),
            spy2 = sinon.spy(),
            spy3 = sinon.spy();

        aexpr(() => obj.a, locals)
            .onChange(spy1)
            .onChange(spy2)
            .onChange(spy3);

        obj.a = 2;

        expect(spy1.calledOnce).to.be.true;
        expect(spy2.calledOnce).to.be.true;
        expect(spy3.calledOnce).to.be.true;
    });

    it("use multiple aexprs", () => {
        var obj = {a: 1};
        let spy = sinon.spy();

        aexpr(() => obj.a, locals).onChange(spy);
        aexpr(() => obj.a, locals).onChange(spy);

        obj.a = 2;

        expect(spy.calledTwice).to.be.true;
    });

    it("uninstalls an aexpr (and reinstalls it afterwards)", () => {
        var obj = {a: 2, b: 3};
        let spy = sinon.spy();

        let expr = aexpr(function() {
            return obj.a;
        }, locals).onChange(spy);

        expr.revoke();

        obj.a = 42;

        expect(spy.called).to.be.false;

        expr.installListeners();

        obj.a = 3;

        expect(spy.calledOnce).to.be.true;
    });

    // TODO: this has no check currently, so it currently just make sure our interpreter can work with property accessors
    it("deals with the prototype chain", () => {
        var superObj = {a: 'superA', b: 'superB'},
            subObj = Object.create(superObj, {
                b: {
                    value: 'subB',
                    configurable: true,
                    enumerable: true,
                    writable: true
                },
                c: {value: 'subC', configurable: true}
            });

    });

    it("handles assignments of complex objects", () => {
        let spy = sinon.spy(),
            complexObject = {
                foo: {
                    bar: 17
                }
            };

        aexpr(() => complexObject.foo.bar, locals).onChange(spy);

        complexObject.foo.bar = 33;
        expect(spy.calledOnce).to.be.true;

        let newBar = { bar: 42 };
        complexObject.foo = newBar;
        expect(spy.calledTwice).to.be.true;

        // changing th new bar property should trigger the callback
        newBar.bar = 0;
        expect(spy.calledThrice).to.be.true;
    });

    // TODO: this works as long as our interpreter supports basic function calls (even if not interpreted)
    it("can do function calls", () => {
        function double(x) {
            return 2 * x;
        }

        let obj = { a: 17 },
            spy = sinon.spy();

        aexpr(() => double(obj.a), locals).onChange(spy);

        obj.a = 21;
        expect(spy.calledOnce).to.be.true;
    });

    // TODO: TRACE INTO FUNCTION CALLS
    xit("traces simple function calls on objects", () => {
        let spy = sinon.spy(),
            rect = {
                width: 10,
                height: 20,
                area() {
                    return this.width * this.height;
                }
            };

        aexpr(() => rect.area(), locals).onChange(spy);

        rect.height = 33;
        expect(spy.calledOnce).to.be.true;
        //expect(spy.withArgs(330).calledOnce).to.be.true;
    });

    // TODO: currently leads to an error, as the property rect.area is overwritten, yet only the prototype has the .area function
    xit("traces function calls to the prototype of an object", () => {
        class Rectangle {
            constructor(width, height) {
                this.width = width;
                this.height = height;
            }

            area() {
                return this.width * this.height;
            }
        }

        let rect = new Rectangle(10, 20),
            spy = sinon.spy();

        aexpr(() => rect.area(3), locals).onChange(spy);

        rect.height = 33;
        expect(spy.calledOnce).to.be.true;
    });

    // TODO: test function call with less/more arguments than expected

    // TODO: Correct this binding for arrow functions
    xit("bind the this reference correctly for arrow functions", () => {
        let spy = sinon.spy();

        class Obj {
            constructor(foo) {
                this.foo = foo;
                this.expr = aexpr(() => this.foo, locals);
            }
        }

        let obj = new Obj(17);
        obj.expr.onChange(spy);

        obj.foo = 33;
        expect(spy.calledOnce).to.be.true;
    });

    // TODO: What about the this reference in arrow functions, normal functions and constructors
    xit("tests with a string", () => {
        let spy = sinon.spy();

        class Obj {
            constructor(foo) {
                this.foo = foo;
                this.expr = aexpr(() => this.foo, locals);
            }
        }

        let obj = new Obj(17);
        obj.expr.onChange(spy);

        obj.foo = 33;
        expect(spy.calledOnce).to.be.true;
    });

    describe('parametrizable aexprs', () => {

        it('handles a single instance binding', () => {
            let obj = { val: 17 },
                spy = sinon.spy();

            aexpr(o => o.val, locals, obj).onChange(spy);

            expect(spy).not.to.be.called;

            obj.val = 42;

            expect(spy).to.be.calledOnce;
        });

        it("handle aexprs with one instance binding with multiple variables", () => {
            let obj1 = { val: 1 },
                obj2 = { val: 2 },
                obj3 = { val: 3 },
                spy = sinon.spy();

            aexpr((o1, o2, o3) => o1.val + o2.val + o3.val, locals, obj1, obj2, obj3).onChange(spy);

            expect(spy).not.to.be.called;

            obj1.val = 10;

            expect(spy.withArgs(15)).to.be.calledOnce;

            obj2.val = 20;

            expect(spy.withArgs(33)).to.be.calledOnce;
        });

        it("handle aexprs with multiple instance bindings", () => {
            let obj1 = { val: 1 },
                obj2 = { val: 2 },
                obj3 = { val: 3 },
                spy12 = sinon.spy(),
                spy23 = sinon.spy(),
                expr = (o1, o2) => o1.val + o2.val;

            aexpr(expr, locals, obj1, obj2).onChange(spy12);
            aexpr(expr, locals, obj2, obj3).onChange(spy23);

            expect(spy12).not.to.be.called;
            expect(spy23).not.to.be.called;

            obj1.val = 10;

            expect(spy12.withArgs(12)).to.be.calledOnce;
            expect(spy23).not.to.be.called;

            obj2.val = 20;

            expect(spy12.withArgs(30)).to.be.calledOnce;
            expect(spy23.withArgs(23)).to.be.calledOnce;

            obj3.val = 30;

            expect(spy12.withArgs(30)).to.be.calledOnce;
            expect(spy23.withArgs(50)).to.be.calledOnce;
        });
    });

    describe('Dealing With Globals', function() {

        it("access Math object", () => {
            let spy = sinon.spy(),
                obj = {
                    a: 2,
                    b:3
                };

            aexpr(() => Math.max(obj.a, obj.b), locals).onChange(spy);

            obj.a = 33;
            obj.b = 42;
            expect(spy).to.be.calledTwice;
        });

        it("access global objects", () => {
            let spy = sinon.spy(),
                obj = { a: 2 };

            aexpr(() => __interpretation_test_global__ === obj.a, locals).onChange(spy);

            obj.a = 42;

            expect(spy).to.be.calledOnce;

            // TODO: we currently do not listen to changes to global objects
            return;
            __interpretation_test_global__ = 17;
            expect(spy).to.be.calledTwice;
        });

        // TODO: Transpiler magic currently renders us unable to refer to a global object in a function that does not have an explicit scope object, because the transpiler introduces variables in the function's local scope
        xit("access global objects in functions without an explicit scope object", () => {
            let spy = sinon.spy(),
                obj = { a: 2 };

            aexpr(() => getInterpretationTestGlobal() === obj.a + 2, locals).onChange(spy);

            obj.a = 42;

            expect(spy).to.be.calledOnce;
        });
    });
});
