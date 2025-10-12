import axios from "axios";


export const doApiGet = async (_url) => {
    try {
        const resp = await axios({
            url: _url,
            headers: {
                "x-api-key": localStorage[TOKEN_KEY]
            }
        })
        return resp.data;
    }
    catch (err) {
        if (err.response) {
            console.error("API Error:", err.response.status, err.response.data);
        } else if (err.request) {
            console.error("No response from API:", err.request);
        } else {
            console.error("General Error:", err.message);
        }
    }
}



export const doApiMethod = async (_url, _method, _body) => {
    try {
        const resp = await axios({
            url: _url,
            method: _method,
            data: _body,
            headers: {
                "x-api-key": localStorage[TOKEN_KEY]
            }
        })
        return resp.data;
    }
    catch (err) {
        console.log(err);
        throw err;
    }
}






