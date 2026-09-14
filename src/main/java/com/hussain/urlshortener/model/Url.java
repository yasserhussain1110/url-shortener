package com.hussain.urlshortener.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import lombok.Data;

import static jakarta.persistence.GenerationType.IDENTITY;

@Entity(name = "urls")
@Data
public class Url {
    @Id
    @GeneratedValue(strategy = IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String originalUrl;
}
