import { useState, useRef, useEffect } from 'react';
import { Save, FolderOpen, Download, Settings } from 'lucide-react';
import { saveFTCAutoFile, loadFTCAutoFile, exportPathData } from '../utils/fileHelpers';
import AttributesInputField from './AttributesInputField';
import Logo from "../assets/favicon-228.png";

function TopBar({ robot, setRobot, paths, setPaths, obstacles, setObstacles, fileInputRef }) {
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const configRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (configRef.current && !configRef.current.contains(event.target)) {
                setIsConfigOpen(false);
            }
        }
        if (isConfigOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isConfigOpen]);

    return (
        <div className='Top-bar'>
            <div className="LogoContainer">
                <img className="Logo" src={Logo} alt="FTC Lightspeed" />
                <h3>FTC LIGHTSPEED</h3>
            </div>

            <div className='Top-bar-buttons'>
                <button onClick={() => saveFTCAutoFile({ robot, paths, obstacles })} title="Load Lightspeed file">
                    <FolderOpen size={16} />
                </button>

                <input
                    type="file"
                    accept=".ftcpath,application/json"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                            loadFTCAutoFile(file, { setRobot, setPaths, setObstacles });
                            e.target.value = ""; // Reset input so re-selecting same file works
                        }
                    }}
                />
                <button onClick={() => fileInputRef.current?.click()} title="Save Lightspeed file">
                    <Save size={16} />
                </button>

                <button onClick={() => exportPathData(paths)} title="Export Paths for Pathing">
                    <Download size={16} />
                </button>

                <div className='Divider' />

                <div className="Config-container" ref={configRef}>
                    <button
                        className={isConfigOpen ? 'active' : ''}
                        onClick={() => setIsConfigOpen(!isConfigOpen)}
                        title="Robot Configuration"
                    >
                        <Settings size={16} />
                    </button>

                    {isConfigOpen && (
                        <div className="Config-dropdown">
                            <AttributesInputField robot={robot} setRobot={setRobot} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TopBar;