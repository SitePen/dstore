define([
	'./Store',
	'./Model',
	'./Memory',
	// TODO: Examing the following has!host-browser checks to see if the tests can be made to run outside of a browser
	'intern/node_modules/dojo/has!host-browser?./Request',
	'intern/node_modules/dojo/has!host-browser?./Rest',
	'./Observable',
	'intern/node_modules/dojo/has!host-browser?./Cache',
	'intern/node_modules/dojo/has!host-browser?./Csv',
	'intern/node_modules/dojo/has!host-browser?./rql',
	'./validating',
	'./validators',
	'./legacy/DstoreAdapter-Memory',
	'./charting/StoreSeries',
	'./legacy/StoreAdapter-Memory',
	'intern/node_modules/dojo/has!host-browser?./legacy/StoreAdapter-JsonRest'
], function () {
});
