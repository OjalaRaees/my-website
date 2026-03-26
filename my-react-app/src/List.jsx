function List({items=[], category="Category"}){
/*     let s = [...fruits].filter(fruit=>fruit.calories>100);
    let y= s.sort((a,b)=> (a.name).localeCompare(b.name));
    let x= y.map((fruit, index) =>
                    <li key={index}>{fruit.name}: &nbsp;
                    {fruit.calories}
                    </li>
    )
    return <ul>{x}</ul>; */
    return(
        <>
        <p className="category">{category}</p>
        <ul className="list">
            {[...items].
            filter(fruit=> fruit.calories<100)
            .sort((a,b)=> a.name.localeCompare(b.name))
            .map((fruit, index)=> 
            <li key= {index}>{fruit.name}:
            {fruit.calories}
            </li>
            )
            }
        </ul>
        </>
    );
}

export default List