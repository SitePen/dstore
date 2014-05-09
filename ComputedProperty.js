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
				var dependency = dependsOn[i];
				args[i] = typeof dependency === 'object' ?
					// the dependency is another reactive object
					dependency.valueOf() :
					// otherwise, treat it as a propery
					dependency === this.name ?
						// don't recursively go through getters on our own property
						parentObject[this.name] :
						// another property
						parentObject.get(dependency);
			}
			return (this.value = this.getValue.apply(this, args));
		},
		_has: function () {
			return true;
		},
		_addListener: function (listener) {
			// TODO: do we want to wait on computed properties that return a promise?
			var property = this;
			var dependsOn = this.dependsOn || [this.name];
			var handles = [];
			function changeListener() {
				// recompute the value of this property. we could use when() here to wait on promised results
				property._queueChange(listener);
			}
			for (var i = 0; i < dependsOn.length; i++) {
				// listen to each dependency
				var dependency = dependsOn[i];
				handles.push(typeof dependency === 'object' ?
					// it is another reactive object
					dependency.observe(changeListener, true) :
					// otherwise treat as property
					dependency === this.name ?
						// setup the default listener for our own name
						this.inherited(arguments, [changeListener]) :
						// otherwise get the other property and listen
						this._parent.property(dependsOn[i]).observe(changeListener, {onlyFutureUpdates: true}));
			}
			return {
				remove: function () {
					for (var i = 0; i < dependsOn.length; i++) {
						handles[i].remove();
					}
				}
			};
		}
	});
});