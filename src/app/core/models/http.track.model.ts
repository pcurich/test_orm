export interface HttpMockEntity {
    name?: string;
    serviceCode: string;
    url: string;
    method: string;
    httpCodeResponseValue: number;

    delayMs: number;
    headers?: Record<string, string>;
    responseBody: string;
}
