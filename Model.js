define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/Stateful',
	'dojo/Deferred',
	'dojo/when'
], function (declare, lang, Stateful, Deferred, when) {

	function watchNotification(key, oldValue, newValue) {
		// this is a generic function for handling watch notifications,
		// and triggering updates in the reactive property objects.
		// By creating a single function, we can save some memory
		if (oldValue !== newValue) {
			var property = (this._properties || 0)[key];
			if (property) {
				property.is(newValue, oldValue);
			}
		}
	}

	function getSchemaProperty (object, key) {
		// this function will retrieve the individual property definition
		// from the schema, for the provided object and key
		var definition = object.schema[key];
		if (definition !== undefined && !(definition instanceof Property)) {
			return object.schema[key] = new Property(definition);
		}
		if (definition) {
			definition.key = key;
		}
		return definition;
	}

	function validate(object, key, value, setting) {
		// this performs validation, delegating validation, and coercion
		// handling to the property definitions objects.
		var inheritingProperty,
			// we get the reactive property object from our hash of properties
			property = object.hasOwnProperty('_properties') && object._properties[key];
		if (!property) {
			// or, if we don't our own property object, we inherit from the schema
			inheritingProperty = true;
			property = getSchemaProperty(object, key);
		}
		var result;
		if (property) {
			// clear any errors
			if (!inheritingProperty && property.errors) {
				property.set('errors', []);
			}
			// perform coercion
			if (setting && property.coerce) {
				value = property.coerce(value);
			}
			// perform validation, if we are set to do this
			if (property.validate && (!setting || object.validateOnSet)) {
				if (inheritingProperty) {
					// validate may set errors on itself, so we need to 
					// tentatively create our own property object instance.
					// if nothing fails to validate, this can be GC'ed
					property = lang.delegate(property, {
						parent: object,
						value: value
					});
				}
				property.value = value;
				result = when(property.validate(), function(isValid) {
					if (!isValid) {
						// errors, so don't perform set
						if (inheritingProperty) {
							// but we do need to store our property
							// instance if we don't have our own
							(object.hasOwnProperty('_properties') ?
								object._properties :
								object._properties = new Hidden())[key] = property;
						}
					}
					return isValid;
				});
			}
		}
		return setting ? value : result;
	}
	var Model = declare(Stateful, {
		//	summary:
		//		A base class for modelled data objects.

		//	schema: Object | dstore/Property
		//		A hash map where the key corresponds to a property definition. 
		//		This can be a string corresponding to a JavaScript
		//		primitive values (string, number, boolean), a constructor, a
		//		null (to allow any type), or a Property object with more advanced
		//		definitions.
		schema: {},

		//	additionalProperties: boolean
		//		This indicates whether properties are allowed that are not 
		//		defined in the schema.
		additionalProperties: true,

		//	validateOnSet: boolean
		//		Indicates whether or not to perform validation when properties
		//		are modified.
		//		This can provided immediate feedback and on the success
		//		or failure of a property modification. And Invalid property 
		//		values will be rejected. However, if you are
		//		using asynchronous validation, invalid property values will still
		//		be set.
		validateOnSet: true,

		//	scenario: string
		//		The scenario that is used to determine which validators should
		//		apply to this model. There are two standard values for scenario,
		//		"insert" and "update", but it can be set to any arbitrary value
		//		for more complex validation scenarios.
		scenario: 'update',

		constructor: function (options) {
			// if we are being constructed, we default to the insert scenario
			this.scenario = 'insert';
			// copy in the default values
			for (var key in this.schema) {
				var definition = this.schema[key];
				if (definition && typeof definition === 'object' && 'default' in definition) {
					this[key] = definition.default;
				}
			}
		},

		save: function (/*boolean*/ skipValidation) {
			//	summary:
			//		Saves this object. By default, this is a no-op. Implementations should call `commit` after saving
			//		has completed.
			//	skipValidation:
			//		Normally, validation is performed to ensure that the object
			//		is not invalid before being stored. Set `skipValidation` to
			//		true to skip it.
			//	returns: any

			var object = this;
			return when(skipValidation ? true : this.validate(), function (isValid) {
				if (!isValid) {
					throw this.validateError();
				}
				var scenario = object.scenario;
				// suppress any non-date from serialization output
				object.prepareForSerialization();
				return object._store && when(object._store[scenario === 'insert' ? 'add' : 'put'](object), function(returned) {
					if (typeof returned == 'object') {
						// receive any updates from the server
						object.set(returned);
					}
					object.scenario = 'update';
				});
			});
		},

		prepareForSerialization: function () {
			//	summary:
			//		This method is responsible for cleaing up any properties on the instance
			//		object to ensure it can easily be serialized (by JSON.stringify at least)
			this.scenario = undefined;
			if (this._inherited) {
				this._inherited.toJSON = toJSONHidden;
			}
		},

		validationError: function () {
			//	summary:
			//		This is called when a save is attempted and a validation error was found.
			//		This can be overriden with locale-specific messages
			return new Error('Validation error');
		},

		receive: function (/*string*/ key, /*function?*/ callback) {
			//	summary:
			//		Gets a new reactive property object, representing the present and future states
			//		of the provided property. You can optionally provide a callback as well.

			// create the properties object, if it doesn't exist yet
			var properties = this.hasOwnProperty('_properties') ? this._properties :
				(this._properties = new Hidden());
			var property = properties[key];
			// if it doesn't exist, create one, delegated from the schema's property definition
			// (this gives an property instance, owning the current property value and listeners,
			// while inheriting metadata from the schema's property definitions)
			if (!property) {
				property = getSchemaProperty(this, key);
				// delegate, or just create a new instance if no schema definition exists
				property = properties[key] = property ? lang.delegate(property) : new Property();
				// give it the correct initial value
				property.value = this.get(key);
				var parent = this;
				// define it's put function, so it syncs back to this object
				property.put = function (value) {
					parent.set(key, value);
				};
				// and listen for changes, so that property instance is synced to this object
				this.watch(key, watchNotification);
			}
			if (callback) {
				// if we have the second arg, setup the listener
				return property.receive(callback);
			}
			return property;
		},


		set: function (/*string*/ key, /*any?*/ value) {
			//	summary:
			//		Only allows setting keys that are defined in the schema,
			//		and remove any error conditions for the given key when
			//		its value is set.

			if (typeof key !== 'object') {
				value = validate(this, key, value, true);
				if (!(key in this.schema) && !this.additionalProperties) {
					// TODO: Shouldn't this throw an error instead of just giving a warning?
					return console.warn('Schema does not contain a definition for', key);
				}
			}
			return this.inherited(arguments);
		},

		validate: function (/*string[]?*/ fields) {
			//	summary:
			//		Validates the current object.
			//	fields:
			//		If provided, only the fields listed in the array will be
			//		validated.
			//	returns: boolean | dojo/promise/Promise
			//		A boolean or a promise that resolves to a boolean indicating whether
			//		or not the model is in a valid state.

			var object = this,
				isValid = true,
				remaining = 1,
				deferredValidation,
				fieldMap;

			if (fields) {
				fieldMap = {};
				for (var i = 0; i < fields.length; i++) {
					fieldMap[i] = true;
				}
			}
			// iterate through the keys in the schema.
			// note that we will always validate every property, regardless of when it fails,
			// and we will execute all the validators immediately (async validators will
			// run in parallel)
			for (var key in this.schema) {
				// check to see if we are allowed to validate this key
				if (!fieldMap || (fieldMap.hasOwnProperty(key))) {
					// run validation
					var result = validate(this, key, this[key]);
					if (result) {
						// valid or the result might be a promise
						if (result.then) {
							// if we haven't setup the deferred for the entire result, do so
							if (!deferredValidation) {
								deferredValidation = new Deferred();
							}
							// increment remaining
							remaining++;
							// wait for the result
							result.then(finishedValidator, function (error) {
								// not valid, if there is an error
								finishedValidator();
							});
						}
					} else {
						// a falsy value, no longer valid
						isValid = false;
					}
				}
			}
			function finishedValidator (isThisValid) {
				// called for completion of each validator, decrements remaining
				remaining--;
				if (!isThisValid) {
					isValid = false;
				}
				if (!remaining) {
					deferredValidation.resolve(isValid);
				}
			}
			if (deferredValidation) {
				// do the last decrement
				finishedValidator(true);
				return deferredValidation.promise;
			}
			// it wasn't async, so we just return the synchronous result
			return isValid;
		},

		isValid: function () {
			//	summary:
			//		Returns whether or not there are currently any errors on
			//		this model due to validation failures. Note that this does
			//		not run validation but merely returns the result of any
			//		prior validation.
			//	returns: boolean

			var isValid = true,
				key;

			for (key in this.schema) {
				var property = this.hasOwnProperty('_properties') && this._properties[key];
				if (property && property.errors && property.errors.length) {
					isValid = false;
				}
			}
			return isValid;
		},

		isFieldRequired: function (/*String*/ key) {
			// summary:
			//		Asks whether the specified field is required.
			// key:
			//		The field in question
			// returns: boolean
			//		A boolean value indicating whether the field is required.

			return !!getSchemaProperty(this, key).required;
		}
	});
	var Reactive = declare(Model, {
		//	summary:
		//		A reactive object is a data model that can contain a value,
		//		and notify listeners of changes to that value, in the future.
		receive: function (/*string?*/ key, /*function?*/ callback) {
			if (typeof key === 'function') {
				// single callback argument
				// create a new reactive to contain the results of the execution
				// of the provided function
				var reactive = new Reactive();
				if (this.hasOwnProperty('value')){
					// we need to notify of the value of the present (as well as future)
					reactive.value = key(this.value);
				}
				// add to the listeners
				(this._listeners || (this._listeners = [])).push(function (value) {
					reactive.is(key(value));
				});
				return reactive;
			}
			// otherwise, a standard receive
			return this.inherited(arguments);
		},

		is: function (/*any*/ value, oldValue) {
			//	summary:
			//		Indicates a new value for this reactive object

			// notify all the listeners of this object, that the value has changed
			var listeners = this._listeners;
			if (oldValue) {
				oldValue = this.value;
			}
			if (listeners) {
				for (var i = 0; i < listeners.length; i++){
					listeners[i].call(this, value);
				}
			}
			// if this was set to an object (or was an object), we need to notify
			// update all the sub-property objects, so they can possibly notify their
			// listeners
			this.value = value;
			var key, property, properties = this._properties;
			if (properties) {
				// we will iterate through the properties recording the changes
				var changes = {};
				if (oldValue && typeof oldValue === 'object'){
					for (key in oldValue) {
						property = properties[key];
						if (property) {
							changes[key] = {old: oldValue[key]};
						}
					}
				}
				if (value && typeof oldValue === 'object'){
					for (key in value) {
						property = properties[key];
						if (property) {
							(changes[key] = changes[key] || {}).value = value;
						}
					}
				}
				for(key in changes){
					// now for each change, we can notify the property object
					var change = changes[key];
					property = properties[key];
					property.is(change.value, change.old);
				}
			}
		},
		put: function (/*any*/ value) {
			//	summary:
			//		Request to change the main value of this reactive object
			this.is(value);
		}
	});
	// a function that returns a function, to stop JSON serialization of an
	// object
	function toJSONHidden () {
		return toJSONHidden;
	}
	// An object that will be hidden from JSON serialization
	var Hidden = declare(null, {
		toJSON: toJSONHidden
	});
	var Property = Model.Property = declare(Reactive, {
		//	summary:
		//		A Property represents a time-varying property value on an object,
		//		along with meta-data. One can listen to changes in this value (through
		//		receive), as well as access and monitor metadata, like default values,
		//		validation information, required status, and any validation errors.

		//	value: any
		//		This represents the value of this property, which can be
		//		monitored for changes and validated

		constructor: function (options) {
			// handle simple definitions
			if (typeof options === 'string' || typeof options === 'function') {
				options = {type: options};
			}
			// and/or mixin any provided properties
			declare.safeMixin(this, options);
		},

		coerce: function (value) {
			//	summary:
			//		Given an input value, this method is responsible
			//		for converting it to the appropriate type for storing on the object.

			var type = this.type;
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
				value = (value === 'false' || value === '0' || value instanceof Array && !value.length) ? false : !!value;
			}
			else if (typeof type === 'function' && !(value instanceof type)) {
					value = new type(value);
			}
			return value;
		},

		validate: function () {
			//	summary:
			//		This method is responsible for validating this particular
			//		property instance.
			var errors = [];
			if (this.type && !((this.type === typeof this.value) ||
					(this.value instanceof this.type))) {
				errors.push(this.type + ' is not a ' + this.type);
			}
			
			if(this.required && !(this.value != null && this.value !== '')) {
				errors.push('required, and it was not present');
			}
			if (!errors.length) {
				this.set('errors', null);
				return true;
			}
			this.set('errors', errors);
		}
	});
	return Model;
});