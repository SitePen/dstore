define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/Deferred',
	'dojo/aspect',
	'dojo/when'
], function (declare, lang, Deferred, aspect, when) {

	function getSchemaProperty (object, key) {
		// this function will retrieve the individual property definition
		// from the schema, for the provided object and key
		var definition = object.schema[key];
		if (definition !== undefined && !(definition instanceof Property)) {
			definition = new Property(definition);
			definition.parent = object;
		}
		if (definition) {
			definition.name = key;
		}
		return definition;
	}

	var hasOwnPropertyInstance;

	function validate(object, key) {
		// this performs validation, delegating validation, and coercion
		// handling to the property definitions objects.
		var hasOwnPropertyInstance,
			property = hasOwnPropertyInstance = object.hasOwnProperty('_properties') && object._properties[key];
		if (!property) {
			// or, if we don't our own property object, we inherit from the schema
			property = getSchemaProperty(object, key);
			if (property && property.validate) {
				property = lang.delegate(property, {
					parent: object,
					key: key
				});
			}
		}

		if (property && property.validate) {
			return when(property.validate(), function(isValid) {
				if (!isValid) {
					// errors, so don't perform set
					if (!hasOwnPropertyInstance) {
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
		return true;
	}

	var slice = [].slice;

	var Model = declare(null, {
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
			lang.mixin(this, options);
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
				return object._store && when(object._store[scenario === 'insert' ? 'add' : 'put'](object),
						function(returned) {
					if (typeof returned === 'object') {
						// receive any updates from the server
						object.set(returned);
					}
					object.scenario = 'update';
				});
			});
		},

		remove: function () {
			var store = this._store;
			return store.remove(store.getIdentity(this));
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

		property: function (/*string+*/ key, /*function?*/ listener) {
			//	summary:
			//		Gets a new reactive property object, representing the present and future states
			//		of the provided property. You can optionally provide a listener, to be notified
			//		of the value of this property, now and in the future
			//	key:
			//		The name of the property to retrieve
			//	listener:
			//		

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
				property.name = key;
				// give it the correct initial value
				var parent = property.parent = this;
			}
			if (listener) {
				if (typeof listener === 'function') {
					// if we have the second arg, setup the listener
					return property.receive(listener);
				} else {
					// go to the next property, if there are multiple
					return property.property.apply(property, slice.call(arguments, 1));
				}
			}
			return property;
		},

		get: function (/*string*/ key, /*function?*/ listener) {
			//	summary:
			//		Standard get() function to retrieve the current value
			//		of a property, augmented with the ability to listen
			//		for future changes

			var property, definition = this.schema[key];
			if (listener) {
				// if there is a listener, we need to register it on the actual
				// property instance object
				property = this.property(key);
				property.receive(listener, true);
			}
			// now we need to see if there is a custom get involved, or if we can just
			// shortcut to retrieving the property value
			definition = property || this.schema[key];
			if (definition && definition.get && (definition.get !== simplePropertyGet || definition.hasCustomGet)) {
				// we have custom get functionality, need to create at least a temporary property
				// instance
				property = property || (this.hasOwnProperty('_properties') && this._properties[key]);
				if (!property) {
					// no property instance, so we create a temporary one
					property = lang.delegate(getSchemaProperty(this, key), {
						name: key,
						parent: this
					});
				}
				// let the property instance handle retrieving the value
				return property.get();
			}
			// default action of just retrieving the property value
			return this[key];
		},

		set: function (/*string*/ key, /*any?*/ value) {
			//	summary:
			//		Only allows setting keys that are defined in the schema,
			//		and remove any error conditions for the given key when
			//		its value is set.

			if (typeof key === 'object') {
				for (var i in key) {
					value = key[i];
					if (key.hasOwnProperty(i) && !(value && value.toJSON === toJSONHidden)) {
						this.set(i, value);
					}
				}
				return;
			}
			var definition = this.schema[key];
			if (!definition && !this.additionalProperties) {
				// TODO: Shouldn't this throw an error instead of just giving a warning?
				return console.warn('Schema does not contain a definition for', key);
			}
			var property = this.hasOwnProperty('_properties') && this._properties[key];
			if (!property &&
					// we need a real property instance if it is an object or if we have a custom put method
					((value && typeof value === 'object') ||
						(definition && definition.put !== simplePropertyPut))) {
				property = this.property(key);
			}
			if (property) {
				// if the property instance exists, use this to do the set
				property.put(value);
			} else {
				if (definition && definition.coerce) {
					// if a schema definition exists, and has a coerce method,
					// we can use without creating a new instance
					if (definition.coerce) {
						value = definition.coerce(value);
					}
				}
				// we can shortcut right to just setting the object property
				this[key] = value;
				// check to see if we should do validation
				if (definition && definition.validateOnSet !== false){
					validate(this, key);
				}
			}

			return value;
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
				errors = [],
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
					var result = validate(this, key);
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
							(function (key) {
								result.then(function (isValid){
									if (!isValid) {
										notValid(key);
									}
									finishedValidator(isValid);
								}, function (error) {
									// not valid, if there is an error
									errors.push(error);
									finishedValidator();
								});
							})(key);
						}
					} else {
						// a falsy value, no longer valid
						notValid(key);
					}
				}
			}
			function notValid(key) {
				// found an error, mark valid state and record the errors
				isValid = false;
				errors.push.apply(errors, object.property(key).errors);
			}
			function finishedValidator (isThisValid) {
				// called for completion of each validator, decrements remaining
				remaining--;
				if (!isThisValid) {
					isValid = false;
				}
				if (!remaining) {
					object.set('errors', isValid ? null : errors);
					deferredValidation.resolve(isValid);
				}
			}
			if (deferredValidation) {
				// do the last decrement
				finishedValidator(true);
				return deferredValidation.promise;
			}
			object.set('errors', isValid ? null : errors);
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
		}
	});
	var Reactive = declare([Model], {
		//	summary:
		//		A reactive object is a data model that can contain a value,
		//		and notify listeners of changes to that value, in the future.
		receive: function (/*function*/ listener, /*boolean?*/ justGetFuture) {
			//	summary:
			//		Registers a listener for any changes in the current value
			//	listener:
			//		Function to be called for each change
			//	justGetFuture:
			//		If this is true, it won't call the listener for the current value,
			//		just future updates. If this is true, it also won't return
			//		a new reactive object
			
			if (!justGetFuture) {
				// create a new reactive to contain the results of the execution
				// of the provided function
				var reactive = new Reactive();
				if (this._has()) {
					// we need to notify of the value of the present (as well as future)
					reactive.value = listener(this.get());
				}
			}
			var property = this;
			// add to the listeners
			var handle = this._addListener(function (value) {
				var result = listener(value);
				if (reactive) {
					reactive.is(result);
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

		_addListener: function (listener) {
			// add a listener for the property change event
			return aspect.after(this, 'onchange', listener, true);
		},

		get: function (/*string?*/ key, /*function?*/ listener) {
			if (typeof key === 'string') {
				// use standard model get to retrieve object by name
				return this.inherited(arguments);
			}
			if (key) {
				// a listener was provided
				this.receive(key, true);
			}
			return this._get();
		},

		_get: function () {
			return this.value;
		},

		_has: function () {
			return this.hasOwnProperty('value');
		},
		_put: function (value) {
			this.value = value;
		},

		is: function (/*any*/ value, oldValue) {
			//	summary:
			//		Indicates a new value for this reactive object

			// notify all the listeners of this object, that the value has changed
			var listeners = this._listeners;
			if (oldValue === undefined) {
				oldValue = this._get();
			}
			this._put(value);
			this.onchange && this.onchange(value, oldValue);
			// if this was set to an object (or was an object), we need to notify
			// update all the sub-property objects, so they can possibly notify their
			// listeners
			var key, property, properties = this._properties,
				hasOldObject = oldValue && typeof oldValue === 'object',
				hasNewObject = value && typeof value === 'object';
			if (hasOldObject ||  hasNewObject) {
				// we will iterate through the properties recording the changes
				var changes = {};
				if (hasOldObject){
					for (key in oldValue) {
						changes[key] = {old: oldValue[key]};
					}
				}
				if (hasNewObject){
					for (key in value) {
						(changes[key] = changes[key] || {}).value = value[key];
					}
				}
				for(key in changes){
					// now for each change, we can notify the property object
					var change = changes[key];
					this.set(key, change.value, change.old);
				}
			}
		},

		put: function (/*any*/ value) {
			//	summary:
			//		Request to change the main value of this reactive object
			value = this.coerce(value);
			if (this.errors) {
				// clear any errors
				this.set('errors', null);
			}
			this.is(value);
			if (this.validateOnSet) {
				this.validate();
			}
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
					value = (value === 'false' || value === '0' || value instanceof Array && !value.length) ? false : !!value;
				}
				else if (typeof type === 'function' && !(value instanceof type)) {
					value = new type(value);
				}
			}
			return value;
		},

		validate: function () {
			//	summary:
			//		This method is responsible for validating this particular
			//		property instance.
			var errors = [], value = this.get();
			if (this.type && !(typeof this.type === 'function' ? (value instanceof this.type) :
				(this.type === typeof value))) {
				errors.push(value + ' is not a ' + this.type);
			}
			
			if(this.required && !(value != null && value !== '')) {
				errors.push('required, and it was not present');
			}
			if (!errors.length) {
				this.set('errors', null);
				return true;
			}
			this.set('errors', errors);
		}

	});
	// a function that returns a function, to stop JSON serialization of an
	// object
	function toJSONHidden () {
		return toJSONHidden;
	}
	// An object that will be hidden from JSON serialization
	var Hidden = function() {
	};
	Hidden.prototype.toJSON = toJSONHidden;

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

		_get: function () {
			return this.parent[this.name];
		},
		_has: function () {
			return this.name in this.parent;
		},
		_put: function (value) {
			this.parent[this.name] = value;
		}
	});
	var simplePropertyGet = Property.prototype.get;
	var simplePropertyPut = Property.prototype.put;
	return Model;
});