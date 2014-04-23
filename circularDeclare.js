define(['dojo/aspect', 'dojo/_base/declare'], function (aspect, declare) {
	// this module is responsible for helping creating classes that involve
	// circular class dependencies
	return function (Base, properties, options) {
		var dependency = options.dependency || Base;
		if (typeof dependency === 'object') {
			// we are executing first, so the dependency is not resolved.
			// First setup the listening for the dependency
			if (options.onDependency) {
				aspect.after(dependency, 'setModule', options.onDependency, true);
			}
			// we are executing first, so can create a constructor
			if (Base !== dependency) {
				// If the Base is not the unresolved dependency than we go ahead
				// and declare
				return declare(Base, properties);
				// and then we just wait for the setModule to be run for the 
			}
			// the factory won't work yet, create a dummy constructor and 
			// wait for the dependency to be ready to run the factory for real
			var Class = declare(function () {}, {});
		} else {
			if (options.onDependency) {
				// if it wants to be notifed of the dependency, it is available immediately
				options.onDependency(dependency);
			}
			// we are executing after the Base, we are good creating our constructor,
			var Class = declare(Base, properties);
			// someone else may need an updated reference though
			if (options.exports.setModule) {
				options.exports.setModule(Class);
			}
		}
		aspect.after(dependency, 'setModule', function (Base) {
			// create the class now, and update the original to behave the same
			var NewClass = declare(Base, properties);
			Class.prototype = NewClass.prototype;
			Class._meta = NewClass._meta;
			Class.superclass = NewClass.superclass;
			if (Class.setModule) {
				Class.setModule(Class);
			}
		}, true);
		return Class;

	};
});