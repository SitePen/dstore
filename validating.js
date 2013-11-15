define(['dojo/_base/lang', 'dojo/Stateful', 'dojo/_base/declare'], function(lang, Stateful, declare){
	// module:
	//		dstore/validating
	//	summary:
	//		This module provides store wrapper that add support for validation of objects
	//		and property changes
	function throwValidationError(validation){
		// create and throw a validation error
		var validationError = new TypeError("Invalid property");
		validationError.errors = validation.errors;
		throw validationError;
	}	
	var validating = function(/*Store*/ store, options){
		var validatingStore = lang.delegate(store);
		validatingStore.model = declare([(store.model && store.model.get) ? 
				store.model : // if a model is provided, we extend it, otherwise we default to extending Stateful 
				Stateful], {
			set: function(name, value){
				// create our own set that does property validation
				var validation = options.validateProperty(name, value);
				if(!validation || validation.valid){
					// in a valid state
					if(validatingStore.allowErrors){
						// if we are in allowErrors mode, reset the errors property
						this.inherited(arguments, [name + 'Error', null]);
					}
				}else{
					if(validatingStore.allowErrors){
						// make the error visible through the errors property 
						this.inherited(arguments, [name + 'Error', validation.errors]);
					}else{
						// not acceptable, will throw
						throwValidationError(validation);
					}
				}
				return this.inherited(arguments);
			}
		});
		// override the put and add to do objectvalidation
		validatingStore.put = function(object){
			var validation = options.validate(object);
			if(validation && !validation.valid){
				throwValidationError(validation);
			}
			// validates, do default action
			return store.put.apply(validatingStore, arguments);
		};
		validatingStore.add = function(object){
			var validation = options.validate(object);
			if(validation && !validation.valid){
				throwValidationError(validation);
			}
			// validates, do default action
			return store.put.apply(validatingStore, arguments);
		};
		return validatingStore;
	};
	return validating;
});