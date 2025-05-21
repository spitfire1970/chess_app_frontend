function MyTable({headings, attribute_list, entries}) {
  return (
    <table className="table-auto mt-4 border-separate border-spacing-x-4">
      <thead>
        <tr className = "text-green">
          {headings.map((heading, index) => (
            <th key={index}>{heading}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, rowIndex) => (
          <tr key={rowIndex}>
            {attribute_list.map((attribute, colIndex) => (
                (typeof entry[attribute] === "number") ?
                <td key={colIndex} className="text-center"> {entry[attribute].toFixed(3)} </td> :
                <td key={colIndex}> {entry[attribute]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default MyTable;