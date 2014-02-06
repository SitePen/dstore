define(['../Property', '../Model', 'dojo/_base/declare', 'json-schema/lib/validate'],
		function (Property, Model, declare, jsonSchemaValidator) {
	// module:
	//		dstore/extensions/JsonSchema
	//	summary:
	//		This module generates a dstore schema from a JSON Schema to enabled validation of objects
	//		and property changes with JSON Schema
	return function (jsonSchema) {
		// create the schema that can be used by dstore/Model
		var modelSchema = {};
		var properties = jsonSchema.properties || jsonSchema;

		// the validation function, this can be used for all the properties
		function checkForErrors() {
			var value = this.valueOf();
			var key = this.name;
			// get the current value and test it against the property's definition
			var validation = jsonSchemaValidator.validate(value, properties[key]);
			// set any errors
			var errors = validation.errors;
			if (errors) {
				// assign the property names to the errors
				for (var i = 0; i < errors.length; i++) {
					errors[i].property = key;
				}
			}
			return errors;
		}

		// iterate through the schema properties, creating property validators
		for (var i in properties) {
			var jsDefinition = properties[i];
			var definition = modelSchema[i] = new Property({
				checkForErrors: checkForErrors
			});
			if (typeof jsDefinition.type === 'string') {
				// copy the type so it can be used for coercion
				definition.type = jsDefinition.type;
			}
			if (typeof jsDefinition['default'] === 'string') {
				// and copy the default
				definition['default'] = jsDefinition['default'];
			}
		}
		return declare(Model, {
			schema: modelSchema
		});
	};
});