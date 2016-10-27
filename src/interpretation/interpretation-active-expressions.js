import Interpreter from './../babelsberg/jsinterpreter/interpreter.js';
import Stack from 'stack-es2015-modules';
import { Listener } from './listener.js';
import { BaseActiveExpression } from 'active-expressions';

const AEXPR_STACK = new Stack();

class Handler {
    constructor() {

    }
}

class InterpreterActiveExpression extends BaseActiveExpression {

    constructor(func, scope, ...params) {
        super(func, ...params);
        this.scope = scope;
        this.propertyAccessors = new Set();

        this.installListeners();
    }

    // TODO: remove indirection
    propertyAssigned() {
        this.checkAndNotify();
    }

    revoke() {
        this.removeListeners();
    }

    installListeners() {
        AEXPR_STACK.withElement(this, () => {
            ActiveExpressionInterpreter.runAndReturn(this.func, this.scope, ...(this.params));
        });
    }

    removeListeners() {
        this.propertyAccessors.forEach(function(propertyAccessor) {
            propertyAccessor.selectionItems.delete(this);
        }, this);
        this.propertyAccessors.clear();
    }
}

export function aexpr(func, scope, ...params) { return new InterpreterActiveExpression(func, scope, ...params); }

export class ActiveExpressionInterpreter extends Interpreter {

    static runAndReturn(func, scope = {}, ...params) {
        function argumentNameForIndex(key) {
            return '__arg__' + key;
        }

        var i = new ActiveExpressionInterpreter(
            `var returnValue = (${func.toString()})(${params.map((value, key) => argumentNameForIndex(key)).join(', ')});`,
            (self, rootScope) => {
                //console.log('scope', scope);
                Object.keys(scope).forEach((k) => {
                    var value = scope[k];
                    //console.log(k, value);
                    self.setProperty(rootScope, k, self.createPseudoObject(value));
                });
                // TODO: delete as the relevant global objects can be inferred by analysing the local scope
                // ["__lvVarRecorder", "jQuery", "$", "_", "lively"].forEach((k) => {
                //     self.setProperty(rootScope, k, self.createPseudoObject(window[k]));
                // });

                params.forEach((value, key) => {
                    let name = argumentNameForIndex(key);
                    self.setProperty(rootScope, name, self.createPseudoObject(value));
                });
            });
        i.run();
        return i.stateStack[0].scope.properties.returnValue.valueOf();
    }

    getProperty(obj, name) {
        let object = obj.valueOf(),
            prop = name.valueOf();

        Listener
            .watchProperty(object, prop)
            .addHandler(AEXPR_STACK.top());

        return super.getProperty(obj, name);
    }

    stepCallExpression(...args) {
        if(this.stateStack[0].arguments > 0) {
            console.log('call expression');
            debugger;
        }
        var stateStack = this.stateStack,
            state = stateStack[0],
            node = state.node,
            func = state.func_;


        return super.stepCallExpression();
    }

}
