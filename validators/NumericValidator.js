define([
	'dojo/_base/declare',
	'dojo/when',
	'../Property',
], function (declare, when, Property) {
	return declare(Property, {
		//	summary:
		//		A validator for enforcing numeric values
		checkForErrors: function (value) {
			var property = this;
			return when(this.inherited(arguments), function (errors) {
				if (isNaN(value)) {
					errors.push(property.notANumberError);
				}
				if (property.minimum >= value) {
					errors.push(property.minimumError);
				}
				if (property.maximum <= value) {
					errors.push(property.maximumError);
				}
				return errors;
			});
		},
		type: 'number',
		//	minimum: Number
		//		The minimum value for the value	
		minimum: -Infinity,
		//	maximum: Number
		//		The maximum value for the value	
		maximum: Infinity,
		//	minimumError: String
		//		The error message for values that are too low
		minimumError: 'The value is too low',
		//	maximumError: String
		//		The error message for values that are too high
		maximumError: 'The value is too high',
		//	notANumberError: String
		//		The error message for values that are not a number
		notANumberError: 'The value is not a number'
	});
});

