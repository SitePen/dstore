define(['doh', 'dstore/Memory', 'dstore/extensions/validatingSchema'], 
		function(doh, Memory, validatingSchema){
	
	var validatingMemory = validatingSchema(new Memory(), {
		properties: {
			prime: Boolean,
			even: Boolean,
			name: {
				type: 'string',
				required: true
			}
		}
	});
	validatingMemory.setData([
			{id: 1, name: 'one', prime: false, mappedTo: 'E'}, 
			{id: 2, name: 'two', even: true, prime: true, mappedTo: 'D'}, 
			{id: 3, name: 'three', prime: true, mappedTo: 'C'}, 
			{id: 4, name: 'four', even: true, prime: false, mappedTo: null}, 
			{id: 5, name: 'five', prime: true, mappedTo: 'A'} 		
		]);

	doh.register('dstore.tests.validatingMemory',
		[
			function testGet(t){
				t.is(validatingMemory.get(1).name, 'one');
			},
			function testPutUpdate(t){
				var four = validatingMemory.get(4);
				four.prime = 'not a boolean';
				four.name = 33;
				var validationError;
				try{
					validatingMemory.put(four);
				}catch(e){
					validationError = e;
				}
				t.is(validationError.errors, [{"property":"prime","message":"string value found, but a boolean is required"},{"property":"name","message":"number value found, but a string is required"}]);
			},
			function testModel(t){
				var four = validatingMemory.get(4);
				var validationErrors = [];
				try{
					four.set('prime', 'not a boolean');
				}catch(e){
					validationErrors.push(e.errors[0]);
				}
				try{
					four.set('name', 33);
				}catch(e){
					validationErrors.push(e.errors[0]);
				}
				t.is(validationErrors, [{"property":"","message":"string value found, but a boolean is required"},{"property":"","message":"number value found, but a string is required"}]);
			},
			
		]
	);
});
