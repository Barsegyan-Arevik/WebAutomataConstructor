"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var Exceptions_1 = require("./Exceptions");
var Mealy_1 = require("./Mealy");
var DMealy = /** @class */ (function (_super) {
    __extends(DMealy, _super);
    function DMealy(graph, startStatements, input) {
        var _this = _super.call(this, graph, startStatements, input) || this;
        _this.step = function () {
            if (!_super.prototype.isDeterministic.call(_this)) {
                throw new Exceptions_1.NonDeterministic();
            }
            return _this.oaRun();
        };
        _this.run = function () {
            if (!_super.prototype.isDeterministic.call(_this)) {
                throw new Exceptions_1.NonDeterministic();
            }
            return _this.oaRun();
        };
        return _this;
    }
    return DMealy;
}(Mealy_1.Mealy));
exports.DMealy = DMealy;
var nfa = new DMealy({
    nodes: [
        { id: 0, isAdmit: false },
        { id: 1, isAdmit: false },
    ],
    edges: [
        { from: 0, to: 0, transitions: new Set([[{ title: '5', output: 'n' }]]) },
        { from: 0, to: 1, transitions: new Set([[{ title: '5', output: 'n' }]]) },
    ]
}, [{ id: 0, isAdmit: false }], []);
console.log(nfa.isDeterministic());
