define([
	'dojo/_base/declare',
	'dojo/when',
	'../Property',
], function (declare, when, Property) {
	return declare(Property, {
		//	summary:
		//		A validator for enforcing string values
		checkForErrors: function (value) {
			var property = this;
			return when(this.inherited(arguments), function (errors) {
				if (property.minimumLength >= value.length) {
					errors.push(property.minimumLengthError);
				}
				if (property.maximumLength < value.length) {
					errors.push(property.maximumLengthError);
				}
				if (property.pattern && !property.pattern.test(value)){
					errors.push(property.patternMatchError);
				}
				return errors;
			});
		},
		type: 'string',
		//	minimumLength: Number
		//		The minimum length of the string
		minimumLength: 0,
		//	maximum: Number
		//		The maximum length of the string
		maximumLength: Infinity,
		// pattern: Regex
		//		A regular expression that the string must match
		pattern: null,
		//	minimumError: String
		//		The error message for values that are too low
		minimumLengthError: 'This is too short',
		//	maximumError: String
		//		The error message for values that are too high
		maximumLengthError: 'This is too long',
		//	patternMatchError: String
		//		The error when a pattern does not match
		patternMatchError: 'The pattern did not match'
	});
});

