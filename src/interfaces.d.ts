import { Handle } from 'dojo-core/interfaces';
import Promise from 'dojo-core/Promise';

// TODO: tailor these as necessary (many were adapted from dstore.d.ts in 1.x)

export interface ChangeEvent<T> {
	id: any;
	index?: number;
	previousIndex?: number;
	target: T;
	totalLength: number;
	type: string;
}

export interface Collection<T> {
	idProperty: string;
	Model?: { new (...args: any[]): T; };
	tracking?: { remove(): void; };

	add(object: T, options?: {}): Promise<T>;
	emit(eventName: string, event: ChangeEvent<T>): boolean;
	fetch(): FetchPromise<T>;
	fetchRange(kwArgs: { start?: number; end?: number; }): FetchPromise<T>;
	filter(query: string | {} | { (item: T, index: number): boolean; }): Collection<T>;
	forEach(callback: (item: T, index: number) => void, thisObject?: any): Promise<T[]>;
	get(id: any): Promise<T>;
	getIdentity(object: T): any;
	on(eventName: string, listener: (event: ChangeEvent<T>) => void): Handle;
	put(object: T, options?: {}): Promise<T>;
	remove(id: any): Promise<Object>;
	sort(property: string | { (a: T, b: T): number; }, descending?: boolean): Collection<T>;
	track?(): Collection<T>;
}

export interface FetchPromise<T> extends Promise<T[]> {
	forEach(callback: (value: T, index?: number, array?: T[]) => void, thisObject?: any): FetchPromise<T>;
	response?: FetchResponse<T>;
	totalLength: Promise<number>;
}

export interface FetchResponse<T> {
	data: T;
	options: { [key: string]: any; };
	status?: number;
	text: string;
	url: string;
	getHeader(name: string): string;
}

/**
 * An optional function that can be used to define the computation of the set of objects returned from a query
 * on client-side or in-memory stores. It is called with the normalized query arguments, and then returns a
 * new function that will be called with an array, and is expected to return a new array.
 */
export interface QuerierFactory<T> {
	(...normalizedArguments: any[]): QuerierFunction<T>;
}

export interface QuerierFunction<T> {
	(data: T[]): T[];
}

export interface QueryLogEntry<T> {
	arguments: any[];
	normalizedArguments: any[];
	querier?: QuerierFunction<T>;
	type: string;
}
