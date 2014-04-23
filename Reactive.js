define([
	'./Model',
	'exports',
	'dojo/when',
	'dojo/promise/all',
	'dojo/aspect',
	'./circularDeclare'
], function (Model, exports, when, all, aspect, declare) {
	var Reactive;
	return Reactive = declare(Model, {
		//	summary:
		//		A reactive object is a data model that can contain a value,
		//		and notify listeners of changes to that value, in the future.
		observe: function (/*function*/ listener, /*object*/ options) {
			//	summary:
			//		Registers a listener for any changes in the current value
			//	listener:
			//		Function to be called for each change
			//	options.onlyFutureUpdates
			//		If this is true, it won't call the listener for the current value,
			//		just future updates. If this is true, it also won't return
			//		a new reactive object
			
			var reactive;
			if (typeof listener === 'string') {
				// a property key was provided, use the Model's method
				return this.inherited(arguments);
			}
			if (!options || !options.onlyFutureUpdates) {
				// create a new reactive to contain the results of the execution
				// of the provided function
				reactive = new Reactive();
				if (this._has()) {
					// we need to notify of the value of the present (as well as future)
					reactive.value = listener(this.valueOf());
				}
			}
			// add to the listeners
			var handle = this._addListener(function (value) {
				var result = listener(value);
				if (reactive) {
					// TODO: once we have a real notification API again, call that, instead 
					// of requesting a change
					reactive.put(result);
				}
			});
			if (reactive) {
				reactive.remove = handle.remove;
				return reactive;
			} else {
				return handle;
			}
		},

		//	validateOnSet: boolean
		//		Indicates whether or not to perform validation when properties
		//		are modified.
		//		This can provided immediate feedback and on the success
		//		or failure of a property modification. And Invalid property 
		//		values will be rejected. However, if you are
		//		using asynchronous validation, invalid property values will still
		//		be set.
		validateOnSet: true,

		//	validators: Array
		//		An array of additional validators to apply to this property
		validators: null,

		_addListener: function (listener) {
			// add a listener for the property change event
			return aspect.after(this, 'onchange', listener, true);
		},

		valueOf: function () {
			return this._get();
		},

		_get: function () {
			return this.value;
		},

		_has: function () {
			return this.hasOwnProperty('value');
		},
		setValue: function (value) {
			//	summary:
			//		This method is responsible for storing the value. This can
			//		be overriden to define a custom setter
			//	value: any
			//		The value to be stored
			//	parent: Object
			//		The parent object of this propery
			this.value = value;
		},

		put: function (/*any*/ value) {
			//	summary:
			//		Indicates a new value for this reactive object

			// notify all the listeners of this object, that the value has changed
			var oldValue = this._get();
			value = this.coerce(value);
			if (this.errors) {
				// clear any errors
				this.set('errors', undefined);
			}
			var property = this;
			// call the setter and wait for it
			return when(this.setValue(value, this._parent), function (result) {
				if (result !== undefined) {
					// allow the setter to change the value
					value = result;
				}
				// notify listeners
				property.onchange && property.onchange(value, oldValue);
				// if this was set to an object (or was an object), we need to notify
				// update all the sub-property objects, so they can possibly notify their
				// listeners
				var key,
					hasOldObject = oldValue && typeof oldValue === 'object',
					hasNewObject = value && typeof value === 'object';
				if (hasOldObject ||  hasNewObject) {
					// we will iterate through the properties recording the changes
					var changes = {};
					if (hasOldObject) {
						for (key in oldValue) {
							changes[key] = {old: oldValue[key]};
						}
					}
					if (hasNewObject) {
						for (key in value) {
							(changes[key] = changes[key] || {}).value = value[key];
						}
					}
					for (key in changes) {
						// now for each change, we can notify the property object
						var change = changes[key];
						property.set(key, change.value, change.old);
					}
				}
				if (property.validateOnSet) {
					property.validate();
				}

			});
		},

		coerce: function (value) {
			//	summary:
			//		Given an input value, this method is responsible
			//		for converting it to the appropriate type for storing on the object.

			var type = this.type;
			if (type) {
				if (type === 'string') {
					value = '' + value;
				}
				else if (type === 'number') {
					value = +value;
				}
				else if (type === 'boolean') {
					// value && value.length check is because dijit/_FormMixin
					// returns an array for checkboxes; an array coerces to true,
					// but an empty array should be set as false
					value = (value === 'false' || value === '0' || value instanceof Array && !value.length) ?
						false : !!value;
				}
				else if (typeof type === 'function' && !(value instanceof type)) {
					/* jshint newcap: false */
					value = new type(value);
				}
			}
			return value;
		},

		addError: function (error) {
			//	summary:
			//		Add an error to the current list of validation errors
			//	error: String
			//		Error to add
			this.set('errors', (this.errors || []).concat([error]));
		},

		checkForErrors: function (value) {
			//	summary:
			//		This method can be implemented to simplify validation.
			//		This is called with the value, and this method can return
			//		an array of any errors that were found. It is recommended
			//		that you call this.inherited(arguments) to permit any
			//		other validators to perform validation
			//	value:
			//		This is the value to validate.
			var errors = this.errors = [];
			if (this.type && !(typeof this.type === 'function' ? (value instanceof this.type) :
				(this.type === typeof value))) {
				errors.push(value + ' is not a ' + this.type);
			}
			
			if (this.required && !(value != null && value !== '')) {
				errors.push('required, and it was not present');
			}
			return errors;
		},

		validate: function () {
			//	summary:
			//		This method is responsible for validating this particular
			//		property instance.
			var property = this;
			var model = this._parent;
			var validators = this.validators;
			var value = this.valueOf();
			var totalErrors = [];
			var asyncValidations;

			// iterator through any validators (if we have any)
			if (validators) {
				for (var i = 0; i < validators.length; i++) {
					addValidation(validators[i].checkForErrors(value, property, model));
				}
			}
			// check our own validation
			addValidation(property.checkForErrors(value, property, model));

			if (asyncValidations) {
				return all(asyncValidations).then(handleErrors);
			}
			return handleErrors();

			function addValidation(validation) {
				if (validation.then) {
					(asyncValidations || (asyncValidations = [])).push(validation.then(addErrors));
				} else{
					addErrors(validation);
				}
			}
			function addErrors(errors) {
				if (errors) {
					// if we have an array of errors, add it to the total of all errors
					totalErrors.push.apply(totalErrors, errors);
				}
			}
			function handleErrors () {
				if (totalErrors.length) {
					// errors exist
					property.set('errors', totalErrors);
					return false;
				}
				// no errors, valid value
				property.set('errors', undefined);
				return true;
			}
		}
	},
	{
		exports: exports
	});

});