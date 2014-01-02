define([
	'dojo/_base/declare',
	'./Property'
], function (declare, Property) {
	return declare(Property, {
		//	dependsOn: Array
		//		This property declares the properties that this property it is computed
		//		from.
		dependsOn: [],

		getValue: function () {
			//	summary:
			//		This function should be implemented to provide custom computed properties
			//		When the corresponding property is accessed, this will be called with the
			//		the values of the properties listed in dependsOn as the arguments
		},
		// indicate that we have custom get functionality
		hasCustomGet: true,
		_get: function () {
			var dependsOn = this.dependsOn;
			var args = [];
			var parentObject = this.parent;
			for (var i = 0; i < dependsOn.length; i++) {
				args[i] = parentObject.get(dependsOn[i]);
			}
			return this.value = this.getValue.apply(this, args);
		},
		_has: function () {
			return true;
		},
		_put: function () {
			throw new Error('No put() method defined for changing computed property value');
		},
		_addListener: function (listener) {
			// TODO: do we want to wait on computed properties that return a promise?
			var property = this;
			var dependsOn = this.dependsOn;
			var handles = [];
			for (var i = 0; i < dependsOn.length; i++) {
				handles.push(this.parent.property(dependsOn[i]).receive(function () {
					// recompute the value of this property. we could use when() here to wait on promised results
					listener(property._get());
				}, true));
			}
			return {
				remove: function() {
					for (var i = 0; i < dependsOn.length; i++) {
						handles[i].remove();
					}
				}
			};
		}
	});
});