package ca.bc.gov.app.smks.model;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;

@JsonInclude(Include.NON_NULL)
public class MapSurround implements Serializable 
{
    private static final long serialVersionUID = 4179616701339603291L;
    
    private String type;
	private String title;
	private String imageSrc;

	public MapSurround() {
		type = "default";
	}

	protected MapSurround( MapSurround mapSurround ) {
		this.setType(mapSurround.getType());
		this.setTitle(mapSurround.getTitle());
		this.setImageSrc(mapSurround.getImageSrc());
	}

	public String getType() { return type; }
	public void setType(String type) { this.type = type; }

	public String getTitle() { return title; }
	public void setTitle(String title) { this.title = title; }

	public String getImageSrc() { return imageSrc; }
	public void setImageSrc(String imageSrc) { this.imageSrc = imageSrc; }
}
