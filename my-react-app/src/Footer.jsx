function Footer(){
    let date= new Date().getFullYear();
    return(
        <footer>
            <p>&copy; {date} All rights reserved</p>
        </footer>
    );
}
export default Footer