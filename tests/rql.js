define(["doh", "dojo/Deferred", "dojo/request/registry", "dstore/rql", "dstore/Memory", "dstore/JsonRest"], 
		function(doh, Deferred, registry, rql, Memory, JsonRest){
	function TestModel(){}
	TestModel.prototype.describe = function(){
		return this.name + " is " + (this.prime ? '' : "not ") + "a prime";
	}
	var rqlMemory = rql(new Memory({
		data: [
			{id: 1, name: "one", prime: false, mappedTo: "E"}, 
			{id: 2, name: "two", even: true, prime: true, mappedTo: "D"}, 
			{id: 3, name: "three", prime: true, mappedTo: "C"}, 
			{id: 4, name: "four", even: true, prime: false, mappedTo: null}, 
			{id: 5, name: "five", prime: true, mappedTo: "A"} 		
		],
		model: TestModel
	}));
	
	doh.register("dstore.tests.RqlMemory",
		[
			function testGet(t){
				t.is(rqlMemory.get(1).name, "one");
				t.is(rqlMemory.get(4).name, "four");
				t.is(rqlMemory.get(1).describe(), "one is not a prime");
			},
			function testQuery(t){
				t.is(rqlMemory.query("prime=true").length, 3);
				t.is(rqlMemory.query("prime=true&even!=true").length, 2);
				t.is(rqlMemory.query("prime=true&id>3").length, 1);
				t.is(rqlMemory.query("(prime=true|id>3)").length, 4);
				t.is(rqlMemory.query("(prime=true|id>3)", {start:1, count: 2}).length, 2);
			},
		]
	);
	var lastMockRequest
	registry.register(/http:\/\/test.com\/.*/, function mock(url){
		lastMockRequest = url;
		console.log("mock request", arguments);
		var def = new Deferred();
		def.resolve("[]");
		def.response = new Deferred();
		return def;
	});
	rqlRest = rql(new JsonRest({
		target: "http://test.com/",
	}));
		
	doh.register("dstore.tests.RqlJsonRest",
		[
			function testQuery(t){
				rqlRest.query({prime: true, even: true})
				t.is(lastMockRequest, "http://test.com/?eq(prime,true)&eq(even,true)");
			},
		]
	);
});
