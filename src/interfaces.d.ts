import { Handle, EventObject } from 'dojo-core/interfaces';
import Promise from 'dojo-core/Promise';

// TODO: tailor these as necessary (many were adapted from dstore.d.ts in 1.x)

export interface ChangeEvent<T> extends EventObject {
	id: any;
	index?: number;
	previousIndex?: number;
	target?: T;
	totalLength?: number;
	beforeId?: string | number;
}

export interface Collection<T> {
	fetch: (args?: FetchArgs) => FetchPromise<T>;
	idProperty: string;
	Model?: { new (...args: any[]): T; };
	tracking?: { remove(): void; };
	queryLog?: {};

	add(object: T, options?: {}): Promise<T>;
	emit(event: EventObject): boolean | void;
	fetchRange(kwArgs: FetchRangeArgs): FetchPromise<T>;
	filter(query: string | {} | { (item: T, index: number): boolean; }): Collection<T>;
	forEach(callback: (item: T, index: number, collection: T[]) => void, thisObject?: any): Promise<T[]>;
	get(id: string | number): Promise<T> | void;
	getIdentity(object: { [ name: string ]: any, get?: (name: string) => any }): any;
	on(type: string, listener: (event: ChangeEvent<T>) => void): Handle;
	put(object: T, options?: {}): Promise<T>;
	remove(id: string | number): Promise<T | void>;
	sort(property: string | { property: string }[] | { (a: T, b: T): number; }, descending?: boolean): Collection<T>;
	track?(): Collection<T>;
	select(properties: string| string[]): Collection<T>;
}

export interface FetchPromise<T> extends Promise<T[]> {
	forEach?(callback: (value: T, index?: number, array?: T[]) => void, thisObject?: any): Promise<void>;
	response?: FetchResponse<T[]>;
	totalLength?: number | Promise<number>;
}

export interface FetchResponse<T> {
	data: T;
	options: { [key: string]: any; };
	status?: number;
	text: string;
	url: string;
	getHeader(name: string): string;
}

export interface FetchArgs {
	queryParams?: string | string[];
	headers?: {};
}

export interface FetchRangeArgs extends FetchArgs {
	start: number;
	end: number;
}
export interface SortOption {
	descending?: boolean;
	property: string;
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

export interface PutDirectives {
	id?: string | number;
	before?: {};
	parent?: {};
	overwrite?: Boolean;
}
