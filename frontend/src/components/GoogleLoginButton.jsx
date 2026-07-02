import { GoogleLogin } from "@react-oauth/google";

const GoogleLoginButton = ({ onSuccess, onError, text = "signin_with" }) => {
    return (
        <div className="w-full flex justify-center">
            <GoogleLogin
                onSuccess={onSuccess}
                onError={onError}
                text={text}
                shape="pill"
                size="large"
                width="100%"
                theme="outline"
            />
        </div>
    );
};

export default GoogleLoginButton;
