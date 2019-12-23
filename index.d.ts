type AscRow = [string, string | number, number] | [string, string | number];
type Asc = AscRow[];

export declare function js2wy(jsCode: string): string;
export declare function js2asc(jsCode: string): string;
export declare function ast2asc(ast: string): Asc;