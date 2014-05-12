define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/json',
	'../Model'
], function (declare, lang, JSON, Model) {
	// summary:
	//		Extends the Model to keep properties on a '_values' sub-object
	// 		This can provide the benefits of keeping properties only
	//		(publicly) accessible through getters and setters and can
	//		also be faster to instantiate
	return declare(Model, {
		_setValues: function (values) {
			return this._values = values || {};
		},

		_getValues: function () {
			return this._values;
		},

		_restore: function (model) {
			// we nest our properties
			var instance = lang.delegate(model.prototype);
			instance._values = this;
			return instance;
		},

		toJSON: function () {
			return this._values;
		}
	});
});