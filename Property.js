define([
	'./circularDeclare',
	'dojo/_base/declare',
	'./Reactive',
	'exports'
], function (declare, baseDeclare, Reactive, exports) {
	return declare(Reactive, {
		//	summary:
		//		A Property represents a time-varying property value on an object,
		//		along with meta-data. One can listen to changes in this value (through
		//		receive), as well as access and monitor metadata, like default values,
		//		validation information, required status, and any validation errors.

		//	value: any
		//		This represents the value of this property, which can be
		//		monitored for changes and validated

		init: function (options) {
			// handle simple definitions
			if (typeof options === 'string' || typeof options === 'function') {
				options = {type: options};
			}
			// and/or mixin any provided properties
			baseDeclare.safeMixin(this, options);
		},

		_get: function () {
			return this._parent[this.name];
		},
		_has: function () {
			return this.name in this._parent;
		},
		setValue: function (value, parent) {
			parent[this.name] = value;
		}
	},
	{
		exports: exports
	});
});