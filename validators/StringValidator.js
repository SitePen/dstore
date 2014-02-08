define([
	'dojo/_base/declare',
	'../Property'
], function (declare, Property) {
	return declare(Property, {
		//	summary:
		//		A validator for enforcing string values
		checkForErrors: function (value) {
			var errors = this.inherited(arguments);
			if (this.minimumLength >= value.length) {
				errors.push(this.minimumLengthError);
			}
			if (this.maximumLength < value.length) {
				errors.push(this.maximumLengthError);
			}
			if (this.pattern && !this.pattern.test(value)) {
				errors.push(this.patternMatchError);
			}
			return errors;
		},
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

