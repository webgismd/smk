package ca.bc.gov.databc.smks.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;

@JsonInclude(Include.NON_NULL)
public class MapSurround implements Cloneable
{
	private String type;
	private String title;

	public MapSurround() { }

	protected MapSurround( MapSurround mapSurround ) {
		this.setType(mapSurround.getType());
		this.setTitle(mapSurround.getTitle());
	}

	public String getType() { return type; }
	public void setType(String type) { this.type = type; }

	public String getTitle() { return title; }
	public void setTitle(String title) { this.title = title; }

	public MapSurround clone()
	{
		MapSurround clone = new MapSurround( this );

		return clone;
	}
}