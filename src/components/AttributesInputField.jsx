function AttributesInputField({ attributes, setAttributes, robot, setRobot }) {
  const listItems = attributes.map((attribute, index) => (
    <div key={attribute.name} className="Attribute-input-item">
      <label>{attribute.name}:</label>
      <input
        className="Attribute-input-number"
        type="number"
        value={attribute.defaultValue}
        onChange={(e) => {
          const newValue = parseFloat(e.target.value);
          if (!isNaN(newValue)) {
            setRobot(prev => {
              const updated = { ...prev };
              const name = attribute.name
                .replace(/\s*\([^)]*\)/g, "")
                .replace(/\s+/g, "")
                .toLowerCase();
              if (name == "width" || name == "length" || name == "buffer") {
                updated[name] = newValue * 25.4; // Convert to mm
              } else {
                updated[name] = newValue;
              }
              return updated;
            });
            setAttributes(prev => {
              const updated = [ ...prev ];
              updated[index] = { ...updated[index], defaultValue: newValue };
              return updated;
            });
          }
        }}
      />
    </div>
  ));

  return (
    <div className="Input-field">
      <h5>Robot Attributes</h5>
      <div className="Attribute-input-items-container">
        {listItems}
      </div>
    </div>
  );
}

export default AttributesInputField;