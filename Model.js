define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/Deferred',
	'dojo/aspect',
	'dojo/when'
], function (declare, lang, Deferred, aspect, when) {

	function getSchemaProperty(object, key) {
		// this function will retrieve the individual property definition
		// from the schema, for the provided object and key
		var definition = object.schema[key];
		if (definition !== undefined && !(definition instanceof Property)) {
			definition = new Property(definition);
			definition._parent = object;
		}
		if (definition) {
			definition.name = key;
		}
		return definition;
	}

	function validate(object, key) {
		// this performs validation, delegating validation, and coercion
		// handling to the property definitions objects.
		var hasOwnPropertyInstance,
			property = object.hasOwnProperty('_properties') && object._properties[key];
		
		hasOwnPropertyInstance = property;

		if (!property) {
			// or, if we don't our own property object, we inherit from the schema
			property = getSchemaProperty(object, key);
			if (property && property.validate) {
				property = lang.delegate(property, {
					_parent: object,
					key: key
				});
			}
		}

		if (property && property.validate) {
			return when(property.validate(), function (isValid) {
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

	function whenEach(iterator) {
		// this is responsible for collecting values from an iterator,
		// and waiting for the results if promises are returned, returning
		// a new promise represents the eventual completion of all the promises
		// this will consistently preserve a sync (non-promise) return value if all
		// sync values are provided
		var deferred;
		var remaining = 1;
		// start the iterator
		iterator(function (value, callback, key) {
			if (value && value.then) {
				// it is a promise, have to wait for it
				remaining++;
				if (!deferred) {
					// make sure we have a deferred
					deferred = new Deferred();
				}
				value.then(function (value) {
					// result received, call callback, and then indicate another item is done
					doneItem(callback(value, key));
				}).then(null, deferred.reject);
			} else {
				// not a promise, just a direct sync callback
				callback(value, key);
			}
		});
		if (deferred) {
			// if we have a deferred, decrement one more time
			doneItem();
			return deferred.promise;
		}
		function doneItem() {
			// called for each promise as it is completed
			remaining--;
			if (!remaining) {
				// all done
				deferred.resolve();
			}
		}
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

		//	_scenario: string
		//		The scenario that is used to determine which validators should
		//		apply to this model. There are two standard values for _scenario,
		//		"insert" and "update", but it can be set to any arbitrary value
		//		for more complex validation scenarios.
		_scenario: 'update',

		constructor: function (options) {
			this.init(options);
		},

		init: function (values) {
			// if we are being constructed, we default to the insert scenario
			this._scenario = 'insert';
			// copy in the default values
			values = this._setValues(values);

			// set any defaults
			for (var key in this.schema) {
				var definition = this.schema[key];
				if (definition && typeof definition === 'object' && 'default' in definition &&
						!values.hasOwnProperty(key)) {
					values[key] = definition['default'];
				}
			}
			
		},

		_setValues: function (values) {
			return lang.mixin(this, values);
		},

		_getValues: function () {
			return this._values || this;
		},

		save: function (/*Object*/ options) {
			//	summary:
			//		Saves this object. By default, this is a no-op. Implementations should call `commit` after saving
			//		has completed.
			//	options.skipValidation:
			//		Normally, validation is performed to ensure that the object
			//		is not invalid before being stored. Set `skipValidation` to
			//		true to skip it.
			//	returns: any

			var object = this;
			return when((options && options.skipValidation) ? true : this.validate(), function (isValid) {
				if (!isValid) {
					throw object.createValidationError(object.errors);
				}
				var scenario = object._scenario;
				// suppress any non-date from serialization output
				object.prepareForSerialization();
				return object._store && when(object._store[scenario === 'insert' ? 'add' : 'put'](object),
						function (returned) {
					// receive any updates from the server
					object.set(returned);
					object._scenario = 'update';
					return object;
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
			this._scenario = undefined;
			if (this._inherited) {
				this._inherited.toJSON = toJSONHidden;
			}
		},

		createValidationError: function (errors) {
			//	summary:
			//		This is called when a save is attempted and a validation error was found.
			//		This can be overriden with locale-specific messages
			//	errors:
			//		Errors that were found in validation
			return new Error('Validation error');
		},

		property: function (/*String...*/ key, nextKey) {
			//	summary:
			//		Gets a new reactive property object, representing the present and future states
			//		of the provided property. The returned property object gives access to methods for changing,
			//		retrieving, and observing the property value, any validation errors, and property metadata.
			//	key: String...
			//		The name of the property to retrieve. Multiple key arguments can be provided
			//		nested property access.

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
				property._parent = this;
			}
			if (nextKey) {
				// go to the next property, if there are multiple
				return property.property.apply(property, slice.call(arguments, 1));
			}
			return property;
		},

		get: function (/*string*/ key) {
			// TODO: add listener parameter back in
			//	summary:
			//		Standard get() function to retrieve the current value
			//		of a property, augmented with the ability to listen
			//		for future changes

			var property, definition = this.schema[key];
			// now we need to see if there is a custom get involved, or if we can just
			// shortcut to retrieving the property value
			definition = property || this.schema[key];
			if (definition && definition.valueOf &&
					(definition.valueOf !== simplePropertyValueOf || definition.hasCustomGet)) {
				// we have custom get functionality, need to create at least a temporary property
				// instance
				property = property || (this.hasOwnProperty('_properties') && this._properties[key]);
				if (!property) {
					// no property instance, so we create a temporary one
					property = lang.delegate(getSchemaProperty(this, key), {
						name: key,
						_parent: this
					});
				}
				// let the property instance handle retrieving the value
				return property.valueOf();
			}
			// default action of just retrieving the property value
			return this._getValues()[key];
		},

		set: function (/*string*/ key, /*any?*/ value) {
			//	summary:
			//		Only allows setting keys that are defined in the schema,
			//		and remove any error conditions for the given key when
			//		its value is set.
			if (typeof key === 'object') {
				startOperation();
				try {
					for (var i in key) {
						value = key[i];
						if (key.hasOwnProperty(i) && !(value && value.toJSON === toJSONHidden)) {
							this.set(i, value);
						}
					}
				} finally {
					endOperation();
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
					value = definition.coerce(value);
				}
				// we can shortcut right to just setting the object property
				this._getValues()[key] = value;
				// check to see if we should do validation
				if (definition && definition.validateOnSet !== false) {
					validate(this, key);
				}
			}

			return value;
		},

		observe: function (/*string*/ key, /*function*/ listener, /*object*/ options) {
			//	summary:
			//		Registers a listener for any changes in the specified property
			//	key:
			//		The name of the property to listen to
			//	listener:
			//		Function to be called for each change
			//	options.onlyFutureUpdates
			//		If this is true, it won't call the listener for the current value,
			//		just future updates. If this is true, it also won't return
			//		a new reactive object
			return this.property(key).observe(listener, options);
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
				errors = [],
				fieldMap;

			if (fields) {
				fieldMap = {};
				for (var i = 0; i < fields.length; i++) {
					fieldMap[i] = true;
				}
			}
			return when(whenEach(function (whenItem) {
				// iterate through the keys in the schema.
				// note that we will always validate every property, regardless of when it fails,
				// and we will execute all the validators immediately (async validators will
				// run in parallel)
				for (var key in object.schema) {
					// check to see if we are allowed to validate this key
					if (!fieldMap || (fieldMap.hasOwnProperty(key))) {
						// run validation
						whenItem(validate(object, key), function (isValid, key) {
							if (!isValid) {
								notValid(key);
							}
						}, key);
					}
				}
			}), function () {
				object.set('errors', isValid ? undefined : errors);
				// it wasn't async, so we just return the synchronous result
				return isValid;
			});
			function notValid(key) {
				// found an error, mark valid state and record the errors
				isValid = false;
				errors.push.apply(errors, object.property(key).errors);
			}
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

	// define the start and end markers of an operation, so we can
	// fire notifications at the end of the operation, by default
	function startOperation() {
		setCallDepth++;
	}
	function endOperation() {
		// if we are ending this operation, start executing the queue
		if (setCallDepth < 2 && onEnd) {
			onEnd();
			onEnd = null;
		}
		setCallDepth--;
	}
	var setCallDepth = 0;
	var callbackQueue;
	var onEnd;
	// the default nextTurn executes at the end of the current operation
	// The intent with this function is that it could easily be replaced
	// with something like setImmediate, setTimeout, or nextTick to provide
	// next turn handling
	(Model.nextTurn = function (callback) {
		// set the callback for the end of the current operation
		onEnd = callback;
	}).atEnd = true;

	var Reactive = declare([Model], {
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
			startOperation();
			return when(this.setValue(value, this._parent), function (result) {
				if (result !== undefined) {
					// allow the setter to change the value
					value = result;
				}
				// notify listeners
				if (property.onchange) {
					// queue the callback
					property._queueChange(property.onchange, oldValue);
				}
				// if this was set to an object (or was an object), we need to notify.
				// update all the sub-property objects, so they can possibly notify their
				// listeners
				var key,
					hasOldObject = oldValue && typeof oldValue === 'object' && !(oldValue instanceof Array),
					hasNewObject = value && typeof value === 'object' && !(value instanceof Array);
				if (hasOldObject || hasNewObject) {
					// we will iterate through the properties recording the changes
					var changes = {};
					if (hasOldObject) {
						oldValue = oldValue._getValues ? oldValue._getValues() : oldValue;
						for (key in oldValue) {
							changes[key] = {old: oldValue[key]};
						}
					}
					if (hasNewObject) {
						value = value._getValues ? value._getValues() : value;
						for (key in value) {
							(changes[key] = changes[key] || {}).value = value[key];
						}
					}
					property._values = hasNewObject && value;
					for (key in changes) {
						// now for each change, we can notify the property object
						var change = changes[key];
						var subProperty = property._properties && property._properties[key];
						if (subProperty && subProperty.onchange) {
							// queue the callback
							subProperty._queueChange(subProperty.onchange, change.old);
						}
					}
				}
				if (property.validateOnSet) {
					property.validate();
				}
				endOperation();
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
			var errors = [];
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

			return when(whenEach(function (whenItem) {
				// iterator through any validators (if we have any)
				if (validators) {
					for (var i = 0; i < validators.length; i++) {
						whenItem(validators[i].checkForErrors(value, property, model), addErrors);
					}
				}
				// check our own validation
				whenItem(property.checkForErrors(value, property, model), addErrors);
				function addErrors(errors) {
					if (errors) {
						// if we have an array of errors, add it to the total of all errors
						totalErrors.push.apply(totalErrors, errors);
					}
				}
			}), function () {
				if (totalErrors.length) {
					// errors exist
					property.set('errors', totalErrors);
					return false;
				}
				// no errors, valid value, if there were errors before, remove them
				if(property.get('errors') !== undefined){
					property.set('errors', undefined);
				}
				return true;
			});
		},
		_queueChange: function (callback, oldValue) {
			// queue up a notification callback
			if (!callback._queued) {
				// make sure we only queue up once before it is called by flagging it
				callback._queued = true;
				var reactive = this;
				// define a function for when it is called that will clear the flag
				// and provide the correct args
				var dispatch = function () {
					callback._queued = false;
					callback.call(reactive, reactive._get(), oldValue);
				};

				if (callbackQueue) {
					// we already have a waiting queue of callbacks, add our callback
					callbackQueue.push(dispatch);
				}
				if (!callbackQueue) {
					// no waiting queue, check to see if we have a custom nextTurn
					// or we are in an operation
					if (!Model.nextTurn.atEnd || setCallDepth > 0) {
						// create the queue (starting with this callback)
						callbackQueue = [dispatch];
						// define the callback executor for the next turn
						Model.nextTurn(function () {
							// pull out all the callbacks
							for (var i = 0; i < callbackQueue.length; i++) {
								// call each one
								callbackQueue[i]();
							}
							// clear it
							callbackQueue = null;
						});
					} else {
						// no set call depth, so just immediately execute
						dispatch();
					}
				}
			}
		},
		toJSON: function () {
			return this._values || this;
		}
	});
	// a function that returns a function, to stop JSON serialization of an
	// object
	function toJSONHidden() {
		return toJSONHidden;
	}
	// An object that will be hidden from JSON serialization
	var Hidden = function () {
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

		init: function (options) {
			// handle simple definitions
			if (typeof options === 'string' || typeof options === 'function') {
				options = {type: options};
			}
			// and/or mixin any provided properties
			if (options) {
				declare.safeMixin(this, options);
			}
		},

		_get: function () {
			return this._parent._getValues()[this.name];
		},
		_has: function () {
			return this.name in this._parent._getValues();
		},
		setValue: function (value, parent) {
			parent._getValues()[this.name] = value;
		}
	});
	var simplePropertyValueOf = Property.prototype.valueOf;
	var simplePropertyPut = Property.prototype.put;
	return Model;
});