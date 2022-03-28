import React, {AllHTMLAttributes, FC} from "react";

import {getRandomString} from "../../../../utils";

import "./GoogleOAuthButton.css";

export interface GoogleOAuthButtonProps extends AllHTMLAttributes<HTMLDivElement> {
}

const GoogleOAuthButton: FC<GoogleOAuthButtonProps> = ({style, className}) => {
    const domain = "https://accounts.google.com/o/oauth2/v2/auth";
    const access_type = "offline";
    const client_id = "196702226545-b0hbpiq78pg29jle3rigem4jcucu8g36.apps.googleusercontent.com";
    const callback_url = process.env.REACT_APP_GOOGLE_OAUTH_CALLBACK_URL;
    const response_type = "code";
    const scope = "https://www.googleapis.com/auth/userinfo.email";
    const state = getRandomString(30);

    document.cookie = `state=${state}; path=/; max-age=3600; secure`;

    const auth_url = `${domain}?access_type=${access_type}&client_id=${client_id}&redirect_uri=${callback_url}&response_type=${response_type}&scope=${scope}&state=${state}`;

    return (
        <div className={`google_oauth_button ${className}`} style={{...style}}>
            <form className="google_oauth_button__form" method="POST" action={auth_url}>
                <button className="google_oauth_button__button" type="submit" value="Authorize via Google OAuth">
                    <img className="google_oauth_button__logo" src={"media/images/google_logo_18.png"} alt="Google icon"
                         aria-hidden/>
                    <p className="google_oauth_button__text">
                        Sign in with Google
                    </p>
                </button>
            </form>
        </div>
    )
};

export default GoogleOAuthButton;
