export interface Client {
    clientId: string;
    name: string;
    color: string;
    coords: LatLng;
    updatedAt?: number
}

export interface LatLng {
    lat: number,
    lng: number
}