define([
	'dojo/_base/declare',
	'dojo/when',
	'dojo/_base/array'
], function (declare, when, array) {

	return declare(null, {
		constructor: function (store, value) {
			// summary:
			//		Series adapter for dstore object stores.
			// store: dstore/api/Store.Collection
			//		A dstore object store.
			// value: Function|Object|String
			//		Function, which takes an object handle, and
			//		produces an output possibly inspecting the store's item. Or
			//		a dictionary object, which tells what names to extract from
			//		an object and how to map them to an output. Or a string, which
			//		is a numeric field name to use for plotting. If undefined, null
			//		or empty string (the default), "value" field is extracted.
			this.store = store;

			if (value) {
				if (typeof value === 'function') {
					this.value = value;
				} else if (typeof value === 'object') {
					this.value = function (object) {
						var o = {};
						for (var key in value) {
							o[key] = object[value[key]];
						}
						return o;
					};
				} else {
					this.value = function (object) {
						return object[value];
					};
				}
			} else {
				this.value = function (object) {
					return object.value;
				};
			}

			this.data = [];

			this._initialRendering = false;
			this.fetch();
		},

		destroy: function () {
			// summary:
			//		Clean up before GC.
			if (this.tracked) {
				this.tracked.remove();
			}
		},

		setSeriesObject: function (series) {
			// summary:
			//		Sets a dojox.charting.Series object we will be working with.
			// series: dojox/charting/Series
			//		Our interface to the chart.
			this.series = series;
		},

		fetch: function () {
			// summary:
			//		Fetches data from the store and updates a chart.
			var store = this.store;
			var self = this;
			if (this.tracked) {
				this.tracked.remove();
			}
			var objects = this.objects = [];
			when(store.forEach(function (object) {
				objects.push(object);
			}), function () {
				self._update();
			});
			if (store.track) {
				var tracked = this.tracked = store.track();
				tracked.on('add, update, remove', update);
			}
			function update() {
				self.objects = tracked.data;
				self._update();
			}
		},

		_update: function () {
			var self = this;
			this.data = array.map(this.objects, function (object) {
				return self.value(object, self.store);
			});
			if (this.series) {
				this.series.chart.updateSeries(this.series.name, this, this._initialRendering);
				this._initialRendering = false;
				this.series.chart.delayedRender();
			}
		}
	});
});
