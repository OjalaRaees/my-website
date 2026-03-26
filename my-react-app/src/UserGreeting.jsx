import PropTypes from "prop-types";

function UserGreeting({name="Guest", isLoggedIn="false"}){
    if(isLoggedIn){
        return <h2>Hello {name}</h2>
    }
    return <h2>Please Log in bro</h2>
}
UserGreeting.PropTypes={
    name: PropTypes.string,
    isLoggedIn: PropTypes.bool
}
UserGreeting.defaultProps={
    name: "Guest",
    isLoggedIn:false,
}
export default UserGreeting