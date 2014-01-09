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
			var dependsOn = this.dependsOn || [this.name];
			var args = [];
			var parentObject = this._parent;
			for (var i = 0; i < dependsOn.length; i++) {
				if (dependsOn[i] === this.name) {
					// don't go back through for our own property
					args[i] = parentObject[this.name];
				} else {
					args[i] = parentObject.get(dependsOn[i]);
				}
			}
			return this.value = this.getValue.apply(this, args);
		},
		_has: function () {
			return true;
		},
		_addListener: function (listener) {
			// TODO: do we want to wait on computed properties that return a promise?
			// TODO: Do we want to queue changes so we don't double compute when multiple dependencies change?
			var property = this;
			var dependsOn = this.dependsOn || [this.name];
			var handles = [];
			function changeListener() {
				// recompute the value of this property. we could use when() here to wait on promised results
				listener(property._get());
			}
			for (var i = 0; i < dependsOn.length; i++) {
				if (dependsOn[i] === this.name) {
					// setup the default listener for our own name
					handles.push(this.inherited(arguments, [changeListener]));
				} else {
					handles.push(this._parent.property(dependsOn[i]).observe(changeListener, true));
				}
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