import {BASE_URL, getAuthHeaders, getParams, SAVES_PORT} from "./apiBase";

export type GetSavesResponse = {
    id: number,
    name: string,
    user_id: string,
}[];

export default function getSaves(onAuthFailed: () => void): Promise<GetSavesResponse> {
    return new Promise(function (resolve, reject) {
        const url = BASE_URL;
        url.port = SAVES_PORT;
        url.pathname = "/saves";

        const headers = getAuthHeaders();
        const params = getParams(headers);

        fetch(url.href, params)
            .then(response => {
                if (response.status == 401) {
                    onAuthFailed();
                }
                if (!response.ok) {
                    throw new Error(response.status + response.statusText);
                }

                return response.json()
            })
            .then(json => resolve(json))
            .catch(error => reject(error));
    });
}