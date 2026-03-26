import PropTypes from "prop-types";
function Student({image,name, details}){
    return(
    <div className="card">
        <img className="card-img" src= {image} alt="cat.png"></img>
        <p className="title">{name}</p>
        <p className="text">{details}</p>
    </div>
    );
}
Student.propTypes={
    image: PropTypes.string,
    name: PropTypes.string,
    details: PropTypes.string,
}
Student.defaultProps={
    image: "/Cat.jpg",
    name: "ojala",
    details:"Guest.com"
}
export default Student 