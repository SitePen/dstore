// jshint unused: false
var profile = (function () {
	var miniExcludes = {
		'dstore/README.md': 1,
		'dstore/package': 1
	};
	var amdRegex = /\.js$/;
	var isRqlRegex = /RqlQuery\.js/;
	var isTestRegex = /\/tests\//;
	var miniExcludeRegex = /\/(?:tests|demos|docs)\//;
	var packages = {};

	try {
		// retrieve the set of packages for determining which modules to include
		require([ 'util/build/buildControl' ], function (buildControl) {
			packages = buildControl.packages;
		});
	}
	catch (error) {
		console.error('Unable to retrieve packages for determining optional package support in dstore');
	}

	return {
		resourceTags: {
			test: function (filename) {
				return isTestRegex.test(filename);
			},

			miniExclude: function (filename, mid) {
				return miniExcludeRegex.test(filename) || mid in miniExcludes;
			},

			amd: function (filename) {
				return amdRegex.test(filename);
			},

			copyOnly: function (filename) {
				// conditionally omit modules dependent on rql packages
				return isTestRegex.test(filename) || (!packages.rql && isRqlRegex.test(filename));
			}
		},

		trees: [
			[ '.', '.', /(?:\/\.)|(?:~$)|(?:(?:html-report|node_modules)\/)/ ]
		]
	};
})();
