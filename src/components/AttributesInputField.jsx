import { ROBOT_ATTRIBUTES } from '../utils/initialData';

function AttributesInputField({ robot, setRobot }) {
  const listItems = ROBOT_ATTRIBUTES.map((attribute) => (
    <div key={attribute.name} className="Attribute-input-item">
      <label>{attribute.name}:</label>
      <input 
        className="Attribute-input-number" 
        type="number" 
        defaultValue={attribute.defaultValue}
        onChange={(e) => {
          const newValue = parseFloat(e.target.value);
          if (!isNaN(newValue)) {
            setRobot(prev => {
              const updated = {...prev};
              if (attribute.name === "Speed") {
                updated.speed = newValue; // Store directly in mm/s
              } else {
                updated[attribute.name.toLowerCase()] = newValue * 25.4; // Convert to mm
              }
              return updated;
            });
          }
          console.log("Robot attributes updated:", robot);
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