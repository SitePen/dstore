define(['dojo/aspect', 'dojo/_base/declare'], function (aspect, declare) {
	// this module is responsible for helping creating classes that involve
	// circular class dependencies
	return function (Base, properties, options) {
		var Class;
		// a delegating constructor is created so that we can
		// wait for the dependency to be ready to run
		var ModuleClass = function () {
			return Class.apply(this, arguments);
		};
		var dependency = options.dependency || Base;
		// if we have listener for the dependency, register it
		if (options.onDependency) {
			aspect.after(dependency, 'setModule', options.onDependency, true);
		}
		if (Base !== dependency) {
			// If the Base is not the unresolved dependency than we go ahead
			// and declare and make it our module result too
			ModuleClass = Class = declare(Base, properties);
		}
		if (typeof dependency !== 'object') {
			// The dependency is resolved, so we can declare our class
			Class = Class || declare(Base, properties);
			// udate references
			updateClass(options.exports);
			// someone else may need an updated reference
			if (options.onDependency) {
				// use the newer one if available
				dependency = dependency._replaceWith || dependency;
				// if it wants to be notifed of the dependency, it is available immediately
				options.onDependency(dependency);
			}
		}
		if (Base === dependency) {
			// if the dependency changes, we need to change as well
			aspect.after(dependency, 'setModule', function (Base) {
				// create the class now, and update the original to behave the same
				Class = declare(Base, properties);
				updateClass(ModuleClass);
			}, true);
		}
		function updateClass(previous) {
			// when a class is created, we update references to it
			// first update declare properties
			ModuleClass.prototype = Class.prototype;
			ModuleClass._meta = Class._meta;
			ModuleClass.superclass = Class.superclass;
			ModuleClass._replaceWith = Class;
			// then notify
			if (previous.setModule) {
				previous.setModule(Class);
			}
		}
		return ModuleClass;
	};
});