import cat from './assets/cat.jpg'
function Card(){
    return(
        <div className="card">
            <img className="card-img" src={cat} alt="Profile pic"></img>
            <h1 className='title'>My Tommie</h1>
            <p className='text'>He is a real 10/10 baddie</p>
        </div>
    );
}
export default Card