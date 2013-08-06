define(['../validating', 'json-schema/lib/validate'], function(validating, jsonSchema){
	// module:
	//		dstore/extensions/validatingSchema
	//	summary:
	//		This module provides store wrapper that add support for validation of objects
	//		and property changes with JSON Schema
	return function(/*Store*/ store, schema){
		return validating(store, {
			validate: function(instance){
				// provide object validation through the JSON Schema validator
				return jsonSchema.validate(instance, schema);
			},
			validateProperty: function(name, value){
				// provide propertyvalidation through the JSON Schema validator
				var propertySchema = schema.properties && schema.properties[name];
				if(propertySchema){
					return jsonSchema.validate(value, propertySchema, name);
				}
			}
		
		});
	};	

});