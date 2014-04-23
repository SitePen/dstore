define([
	'./circularDeclare',
	'./Property',
	'dojo/_base/lang',
	'dojo/Deferred',
	'dojo/aspect',
	'dojo/when',
	'exports'
], function (declare, Property, lang, Deferred, aspect, when, exports) {

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
	// a function that returns a function, to stop JSON serialization of an
	// object
	function toJSONHidden() {
		return toJSONHidden;
	}
	// An object that will be hidden from JSON serialization
	var Hidden = function () {
	};
	Hidden.prototype.toJSON = toJSONHidden;
	var slice = [].slice;
	var simplePropertyValueOf;
	var simplePropertyPut;

	return declare(null, {
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

		init: function (options) {
			// if we are being constructed, we default to the insert scenario
			this._scenario = 'insert';
			// copy in the default values
			for (var key in this.schema) {
				var definition = this.schema[key];
				if (definition && typeof definition === 'object' && 'default' in definition) {
					this[key] = definition['default'];
				}
			}
			lang.mixin(this, options);
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
					value = definition.coerce(value);
				}
				// we can shortcut right to just setting the object property
				this[key] = value;
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
	}, {
		exports: exports,
		dependency: Property,
		onDependency: function (NewProperty) {
			Property = NewProperty;
			simplePropertyValueOf = Property.prototype.valueOf;
			simplePropertyPut = Property.prototype.put;
		}
	});

});