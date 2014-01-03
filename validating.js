define(['./Store', 'dojo/when', 'dojo/_base/declare'], function(Store, when, declare){
	// module:
	//		dstore/Validating
	//	summary:
	//		This module provides a store mixin that enforces validation of objects on put and add
	return declare(Store, {
		validate: function (object, isNew) {
			//	summary:
			//		Validates the given object (by making it an instance of the 
			//		current model, and calling validate() on it)
			//	object: Object
			//		The object to validate
			//	isNew: Boolean
			//		Indicates whether or not to assume the object is new or not
			if (!(object instanceof this.model)) {
				object = isNew ? new this.model(object) : this.assignPrototype(object);
			}
			return when(object.validate(), function (isValid) {
				if (!isValid) {
					// create and throw a validation error
					var validationError = new TypeError('Invalid property');
					validationError.errors = object.errors;
					throw validationError;
				}
				return object; // return the object since it has had its prototype assigned
			});
		},
		put: function (object, options) {
			var inheritedPut = this.getInherited(arguments);
			var store = this;
			return when(this.validate(object), function (object) {
				return inheritedPut.call(store, object, options);
			});
		},
		add: function (object, options) {
			var inheritedAdd = this.getInherited(arguments);
			var store = this;
			return when(this.validate(object, true), function (object) {
				return inheritedAdd.call(store, object, options);
			});
		},
	});
});